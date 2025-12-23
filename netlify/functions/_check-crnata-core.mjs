// Netlify Scheduled Function — NotifArc / CRNATA 18m
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getStore } from "@netlify/blobs";
import { CATEGORIES, CRNATA_URLS } from '../../src/lib/shared/categories.js';
import {emailFooter, emailHeader} from "../../src/lib/shared/email.js";
import {SubscribersStore} from "../../src/lib/shared/subscribersStore.js";
import {EventsStore} from "../../src/lib/shared/eventsStore.js";
import {LogsStore} from "../../src/lib/shared/logsStore.js";

const BUCKET_NAME = "notif-arc";

function nowFR() {
    return new Date().toLocaleString("fr-FR", { timeZone: process.env.LOCAL_TZ || "Europe/Paris" });
}

async function scrapePaginated(startUrl) {
    let url = startUrl;
    const events = [];

    while (url) {
        const res = await fetch("https://www.crnata.fr" + url, { headers: { 'User-Agent': 'NotifArc Netlify Cron' } });
        if (!res.ok) {
            throw new Error(`Fetch ${res.status} @ ${url}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        $('.em-taxonomy-events> ul').find('li').each((_, li) => {
            const a = $(li).find('a[href]').first();
            if (!a.length) return;
            const href = String(a.attr('href') || '').trim();
            const title = a.text().trim();
            const node = a.get(0);
            const dateTxt =
                node && node.nextSibling && node.nextSibling.data
                    ? node.nextSibling.data.trim()
                    : 'Date inconnue';
            events.push({href, title, date: dateTxt});
        });

        //trouver le lien "suivant"
        url = $('a.next.page-numbers').attr('href') || null;
    }
    return events;
}

export async function runCheck({ dryRun = false }) {
    console.log("run crnata function - dryRun : ", dryRun);

    const LOG_KEY = `logs/${Date.now()}.json`;
    const STORE = getStore({ name: BUCKET_NAME, siteID: process.env.NETLIFY_SITE_ID, token: process.env.NETLIFY_AUTH_TOKEN });

    const ts = nowFR();
    const categories = Object.keys(CRNATA_URLS);
    const allEventsByCategory = {};
    const newEventsByCategories = {};
    const knowEventsByCategories = {};

    const log = {traces : []}
    log.traces.push(`${ts} - start runCheck`);

    const logsStore = new LogsStore(STORE, LOG_KEY);
    const eventsStore = new EventsStore(STORE);
    const events = await eventsStore.get();

    // Vérifie si l’exécution précédente est trop récente
    if (events.savedAtEpoch && !dryRun) {
        const diffMin = (Date.now() - events.savedAtEpoch) / 60000;
        if (diffMin < 350) {
            console.log(`Dernier run ${diffMin.toFixed(1)} min → skip`);
            log.traces.push(`${ts} - Dernier run ${diffMin.toFixed(1)} min → skip`);
            await logsStore.write(log)
            return { statusCode: 200, body: `skip: ${diffMin.toFixed(1)} min ago` };
        }
    }

    const results = await Promise.all(
        categories.map(async (category) => {
            const lastEvents = await scrapePaginated(CRNATA_URLS[category]);
            const prevEvents = events[category] || [];

            const prevUrls = new Set(prevEvents.map((e) => e.href));
            const newEvents = lastEvents.filter((e) => !prevUrls.has(e.href));
            const knowEvents = lastEvents.filter((e) => prevUrls.has(e.href));

            return { category, lastEvents, newEvents, knowEvents };
        })
    );

    for (const { category, lastEvents, newEvents, knowEvents } of results) {
        allEventsByCategory[category] = lastEvents;
        newEventsByCategories[category] = newEvents;
        knowEventsByCategories[category] = knowEvents;
    }

    // Met à jour le store
    if (!dryRun) {
        await eventsStore.update(ts, allEventsByCategory);
    }

    let changedCategories = Object.entries(newEventsByCategories)
        .filter(([_, evts]) => evts.length > 0)
        .map(([cat]) => cat);

    if (dryRun) {
        // En mode test : toutes les catégories sont considérées comme "changées"
        changedCategories = Object.keys(CRNATA_URLS);
        console.log("Mode dry run → toutes les catégories considérées comme modifiées");
    }

    if (changedCategories.length === 0) {
        log.traces.push(`${ts} - Aucun nouvel événement — pas de notification.`);
        await logsStore.write(log)
        return { statusCode: 200,  body:"Aucun nouvel événement — pas de notification." };
    }

    console.log("Catégories avec nouveautés :", changedCategories);
    log.traces.push(`${ts} - Catégories avec nouveautés : ${changedCategories}`);

    const subscribersStore = new SubscribersStore(STORE)
    const subscribers = await subscribersStore.list();
    const usersToNotify = subscribers.filter(u =>
        u.categories.some(c => changedCategories.includes(c)) && u.status === "confirmed"
    );

    const segments = new Map();

    for (const user of usersToNotify) {
        // intersection de ses catégories avec celles qui ont changé
        const cats = user.categories.filter(c => changedCategories.includes(c));
        const sig = cats.sort().join(","); // signature
        if (!segments.has(sig)) segments.set(sig, { cats, users: [] });
        segments.get(sig).users.push(user);
    }

    for (const [sig, seg] of segments) {
        // union des nouveaux events de ces catégories
        const newEvents = {};
        const knowEvents = {};

        for (const cat of seg.cats) {
            newEvents[cat] = newEventsByCategories[cat] || [];
            knowEvents[cat] = knowEventsByCategories[cat] || [];
            console.log(`Mandats [${cat}] : ${newEvents[cat].length} nouveaux et ${knowEvents[cat].length} connus`);
            log.traces.push(`${ts} - Mandats [${cat}] : ${newEvents[cat].length} nouveaux et ${knowEvents[cat].length} connus`);
        }

        if (!seg.users.length) {
            log.traces.push(`${ts} - Aucun destinataire pour le segment [${sig}]`);
            continue; // passer au segment suivant
        }

        // Construit l'email
        const html = buildEmail(seg.cats, newEvents, knowEvents, ts);

        const batch =  seg.users.map((user) => ({
            from: process.env.RESEND_FROM,
            to: user.email,
            subject: "NotifArc — Nouveaux mandats",
            html : html + emailFooter(user.token),
            headers: {
                'List-Unsubscribe': `<https://www.notif-arc.fr/unsubscribe?t=${user.token}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            },
        }));

        if (dryRun) {
            log.traces.push(`${ts} - [Dry Run] Email pour [${sig}] : ${"("+ seg.users.length + ") " + seg.users.map(u => u.email).join(', ')}`);
            console.log(`🧪 [Dry Run] Email pour [${sig}] : ${"("+ seg.users.length + ") " + seg.users.map(u => u.email).join(', ')}`);
        } else {
            // --- envoi via Resend ---
            const resp = await fetch("https://api.resend.com/emails/batch", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(batch)
            });

            const text = await resp.text();
            console.log("Resend:", resp.status, text);
            log.traces.push(`${ts} - Resend: ${resp.status} : ${text}`);
        }

        console.log(`✉️  ${dryRun ? "Prévisualisé" : "Envoyé"} à ${seg.users.length} utilisateur(s) pour [${sig}]`);
        log.traces.push(`${ts} - ${dryRun ? "Prévisualisé" : "Envoyé"} à ${seg.users.length} utilisateur(s) pour [${sig}]`);
    }

    if (!dryRun) {
        await logsStore.write(log)
    }
    return { statusCode: 200, body: "success"};
}

function buildEmail(categories, newEvents, knowEvents, ts) {
    let htmlBody = `
      ${emailHeader()}
      <hr />
      <div>
        <h2>Nouveaux Mandats</h2>
      </div>
    `;

    for (const categoryName of categories) {
        if (newEvents[categoryName].length == 0 && knowEvents[categoryName].length == 0 ) {
            continue
        }
        const category = CATEGORIES.find(c => c.slug == categoryName);
        const newHtml = newEvents[categoryName].map((e) => `<li><a href="https://www.notif-arc.fr/r?to=${e.href}">${e.title}</a> ${e.date}</li>`).join("");
        const knowHtml = knowEvents[categoryName].map((e) => `<li><a href="https://www.notif-arc.fr/r?to=${e.href}">${e.title}</a> ${e.date}</li>`).join("");

        htmlBody += `<hr /><div><h3>Mandat ${category.emoji + " " + category.label}</h3></div>`;

        if (newEvents[categoryName].length > 0 ) {
            htmlBody += `
                <h4>Nouveaux :</h4>
                <ul>${newHtml}</ul>
            `;
        }

        if (knowEvents[categoryName].length > 0 ) {
            htmlBody += `
                <h4>Déjà connus :</h4>
                <ul>${knowHtml}</ul>
            `;
        }
    }

    htmlBody += `<p><small style="font-size:.8rem;color:#646b79;font-style:italic;">mis à jour le ${ts}</small></p><hr/>`
    return htmlBody;
}