// Netlify Scheduled Function — NotifArc / CRNATA 18m
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getStore } from "@netlify/blobs";
import { CATEGORIES, CRNATA_URLS } from '../../src/lib/shared/categories.js';
import { emailFooter } from "../../src/lib/shared/email.js";

const SUBS_KEY = "subscribers.json";
const EVENTS_KEY = "nouvelle_aquitaine_events.json";

function nowFR() {
    return new Date().toLocaleString("fr-FR", { timeZone: process.env.LOCAL_TZ || "Europe/Paris" });
}

async function scrapePaginated(startUrl) {
    let url = startUrl;
    const events = [];

    while (url) {
        const res = await fetch("https://www.crnata.fr" + url, { headers: { 'User-Agent': 'NotifArc Netlify Cron' } });
        if (!res.ok) {
            await setJson(`logs/${Date.now()}_ERROR.json`, {status: res.status, url: url})
            throw new Error(`Fetch ${res.status} @ ${url}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);

        $('#em-category-8 > ul').find('li').each((_, li) => {
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

    const ts = nowFR();
    const categories = Object.keys(CRNATA_URLS);
    const allEventsByCategory = {};
    const newEventsByCategories = {};
    const knowEventsByCategories = {};

    const log = {traces : []}
    log.traces.push(`${ts} - start runCheck`);

    const storeEvents = (await getJson(EVENTS_KEY)) || {};

    // Vérifie si l’exécution précédente est trop récente
    if (storeEvents.savedAtEpoch && !dryRun) {
        const diffMin = (Date.now() - storeEvents.savedAtEpoch) / 60000;
        if (diffMin < 350) {
            console.log(`Dernier run ${diffMin.toFixed(1)} min → skip`);
            log.traces.push(`${ts} - Dernier run ${diffMin.toFixed(1)} min → skip`);
            await setJson(LOG_KEY, log);
            return { statusCode: 200, body: `skip: ${diffMin.toFixed(1)} min ago` };
        }
    }

    const results = await Promise.all(
        categories.map(async (category) => {
            const lastEvents = await scrapePaginated(CRNATA_URLS[category]);
            const prevEvents = storeEvents[category] || [];

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
        await setJson(EVENTS_KEY, { savedAt: ts, savedAtEpoch: new Date().getTime(), ...allEventsByCategory});
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
        await setJson(LOG_KEY, log)
        return { statusCode: 200,  body:"Aucun nouvel événement — pas de notification." };
    }

    console.log("Catégories avec nouveautés :", changedCategories);
    log.traces.push(`${ts} - Catégories avec nouveautés : ${changedCategories}`);

    const subscribers = (await getJson(SUBS_KEY )) || [];
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
            console.log(`Nouveaux mandats [${cat}] : ${newEvents[cat].length}`);
            console.log(`Mandats connus [${cat}] : ${knowEvents[cat].length}`);
            log.traces.push(`${ts} - Nouveaux mandats [${cat}] : ${newEvents[cat].length}`);
            log.traces.push(`${ts} - Mandats connus [${cat}] : ${knowEvents[cat].length}`);
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
            log.traces.push(`${ts} - [Dry Run] Email pour [${sig}] : ${seg.users}`);
            console.log(`🧪 [Dry Run] Email pour [${sig}] :`, seg.users);
            log.traces.push(`${ts} - ${html}`);
            console.log(html);
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
        await setJson(LOG_KEY, log)
    }
    return { statusCode: 200, body: "success"};
}

function buildEmail(categories, newEvents, knowEvents, ts) {
    const header = `
     <header>
        <a href="https://www.notif-arc.fr" style="display:flex;align-items:center;font-size: 2rem;color: #3a9092;text-decoration:none;">
            <img src="https://www.notif-arc.fr/notif-arc-logo-512.png" width="68" alt="logo">
            <strong>NotifArc</strong>
        </a> 
        <p style="margin:0 0 2rem 0;font-size:1rem;color:#646b79;font-style:italic;">Ne manquez plus aucune compétition.</p>
    </header>
  `;

    let htmlBody = `
      ${header}
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
        const newHtml = newEvents[categoryName].map((e) => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("");
        const knowHtml = knowEvents[categoryName].map((e) => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("");

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

// Store
const BUCKET = "notif-arc";
async function getJson(key) {
   const store = getStore(
        {
            name: BUCKET,
            siteID: process.env.NETLIFY_SITE_ID,
            token: process.env.NETLIFY_AUTH_TOKEN
        });
    return await store.get(key, { type: "json" });
}

async function setJson(key, data) {
    const store = getStore(
        {
            name: BUCKET,
            siteID: process.env.NETLIFY_SITE_ID,
            token: process.env.NETLIFY_AUTH_TOKEN
        });
    await store.set(key, JSON.stringify(data, null, 2));
}