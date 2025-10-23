// Netlify Scheduled Function — NotifArc / CRNATA 18m
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getStore } from "@netlify/blobs";
import * as events from "node:events";

const SUBS_KEY = "subscribers.json";
const EVENTS_KEY = "nouvelle_aquitaine_events.json";

const URLS = {
    "tir18m": "/evenements/categories/tir-a-18m/",
    "tae_50_70": "/evenements/categories/tae_50_70/"
}

function nowFR() {
    return new Date().toLocaleString("fr-FR", { timeZone: process.env.LOCAL_TZ || "Europe/Paris" });
}

async function scrapePaginated(startUrl) {
    let url = startUrl;
    const events = [];

    while (url) {
        const res = await fetch("https://www.crnata.fr" + url, { headers: { 'User-Agent': 'NotifArc Netlify Cron' } });
        if (!res.ok) throw new Error(`Fetch ${res.status} @ ${url}`);

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
        const nextHref = $('a.next.page-numbers').attr('href') || null;
        url =  nextHref
    }
    return events;
}

export async function runCheck({ forceSend = false, dryRun = false }) {
    console.log("run crnata function - force send : ", forceSend, " - dryRun", dryRun);
    const ts = nowFR();

    // scrapping
    const eventsGlobal = Object.fromEntries(
        await Promise.all(
            ['tir18m'].map(async (category) => [
                category,
                await scrapePaginated(URLS[category])
            ])
        )
    );

    //return { statusCode: 200, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(eventsGlobal)};

    // --- état précédent ---
    let prevWrap = (await getJson(EVENTS_KEY)) || { savedAt: null, tir18m: [] };
    const prev = prevWrap.tir18m;
    const prevUrls = new Set(prev.map(e => e.href));

    //TODO faire pour chaque categorie - voir pour grouper dans le mail des personnes qui le souhaite les categories suivi
    const newItems = eventsGlobal["tir18m"].filter((e) => !prevUrls.has(e.href));
    const knownItems = eventsGlobal["tir18m"].filter((e) => prevUrls.has(e.href));

    // première exécution ? juste snapshot si pas de FIRST_RUN_NOTIFY
    const firstRun = prev.length === 0;
    if (firstRun) {
        await setJson(EVENTS_KEY, {savedAt: ts, tir18m: events});
        console.log("Snapshot saved (first run)");
        return { statusCode: 200,  body:"Snapshot saved (first run)" };
    }

    // rien de neuf et pas de FORCE_SEND
    if (!newItems.length && !forceSend) {
        if (!dryRun) {
            await setJson(EVENTS_KEY, {savedAt: ts, tir18m: eventsGlobal["tir18m"]});
        }
        console.log("No new events");
        return { statusCode: 200, body: "No new events" };
    }

    // --- construire l'email ---
    let htmlBody = "";
    if (newItems.length) {
        const newHtml = newItems.map((e) => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("");
        const knownHtml = knownItems.map((e) => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("");
        htmlBody = `
      <div>
        <h3>Évènements tir à 18 m — Nouveautés</h3>
      </div>
      <h4>Nouveaux :</h4>
      <ul>${newHtml}</ul>
      <h4>Déjà connus :</h4>
      <ul>${knownHtml}</ul>
      <p><small style="color:#666">mis à jour le ${ts}</small></p>
      <hr/>
      <p style="font-size:small;color:#666;">
        Vous recevez cet email car vous êtes inscrit à <a href="https://www.notif-arc.fr">NotifArc</a>.<br/>
        <a href="${process.env.APP_BASE_URL}/unsubscribe">Se désinscrire</a>
      </p>
    `;
    } else {
        const allHtml = events.map((e) => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("");
        htmlBody = `
      <div>
        <h3>Pas de nouveauté — envoi manuel</h3>
      </div>
      <ul>${allHtml}</ul>
      <p><small style="color:#666">mis à jour le ${ts}</small></p>
      <hr/>
      <p style="font-size:small;color:#666;">
        Vous recevez cet email car vous êtes inscrit à <a href="https://www.notif-arc.fr">NotifArc</a>.<br/>
        <a href="${process.env.APP_BASE_URL}/unsubscribe">Se désinscrire</a>
      </p>
    `;
    }

    // --- destinataires ---
    const subs = (await getJson(SUBS_KEY )) || [];
    const toList = subs.filter(s => s.status === "confirmed" && s.email !== "jbehuet@gmail.com").map(s => s.email);
    if (!toList.length) {
        await setJson(EVENTS_KEY, {savedAt: ts, tir18m: eventsGlobal["tir18m"]});
        console.log("No confirmed subscribers");
        return { statusCode: 200, body: "No confirmed subscribers"};
    }

    if (dryRun) {
        console.log("DRY_RUN: preview only\n", htmlBody);
        return { statusCode: 200, body : htmlBody };
    }

    // --- envoi via Resend ---
    const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            from: process.env.RESEND_FROM,
            to: "jbehuet@gmail.com",
            bcc: toList,
            subject: "NotifArc — Nouveaux mandats",
            html: htmlBody
        })
    });
    console.log("Resend:", resp.status, await resp.text());

    await setJson(EVENTS_KEY, {savedAt: ts, tir18m: eventsGlobal["tir18m"]});
    console.log(`OK (new: ${newItems.length}, sent: ${toList.length})`);
    return { statusCode: 200, body : `OK (new: ${newItems.length}, sent: ${toList.length})` };
}

export async function runCheck_({ forceSend = false, dryRun = false }) {
    console.log("run crnata function - force send : ", forceSend, " - dryRun", dryRun);

    const categories = Object.keys(URLS);
    const newEventsByCategories = {};
    const knowEventsByCategories = {};

    const storeEvents = await getJson(EVENTS_KEY);

    for (const category of categories) {
        const lastEvents = await scrapePaginated(URLS[category])
        newEventsByCategories[category] = lastEvents;

        let prevEvents = []
        if (storeEvents.hasOwnProperty(category)) {
            prevEvents = storeEvents[category];
        }

        // comparaison par URL
        const prevUrls = new Set(prevEvents.map(e => e.href));
        const newEvents = lastEvents.filter((e) => !prevUrls.has(e.href));
        const knowEvents = lastEvents.filter((e) => prevUrls.has(e.href));
        // TODO Met à jour le store

        // garde les nouveautés
        newEventsByCategories[category] = newEvents;
        knowEventsByCategories[category] = knowEvents;
    }

    const changedCategories = Object.entries(newEventsByCategories)
        .filter(([_, evts]) => evts.length > 0)
        .map(([cat]) => cat);

    if (changedCategories.length === 0) {
        console.log("Aucun nouvel événement — pas de notification.");
        return;
    }

    console.log("Catégories avec nouveautés :", changedCategories);

    const subscibers = (await getJson(SUBS_KEY )) || [];
    const usersToNotify = subscibers.filter(u =>
        u.categories.some(c => changedCategories.includes(c))
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
        const newEvents = seg.cats.flatMap(c => newEventsByCategories[c]);
        const knowEvents = seg.cats.flatMap(c => knowEventsByCategories[c]);

        // Créer le contenu de l’email
        //const html = buildEmail(seg.cats, events);
        const html = buildEmail(seg.cats, newEvents, knowEvents);

        // Envoyer à tous les utilisateurs du segment (ici simple console)
        for (const u of seg.users) {
            await sendEmail(u.email, html);
        }

        console.log(`✉️  Envoyé à ${seg.users.length} utilisateur(s) pour [${sig}]`);
    }
    return { statusCode: 200, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({segments})};
}

function buildEmail(categories, newEvents, knowEvents) {
    const newHtml = newEvents.map((e) => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("");
    const knownHtml = knownEvents.map((e) => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("");
    const htmlBody = `
      <div>
        <h3>Évènements tir à l\'arc — Nouveautés</h3>
      </div>
      <h4>Nouveaux :</h4>
      <ul>${newHtml}</ul>
      <h4>Déjà connus :</h4>
      <ul>${knownHtml}</ul>
      <p><small style="color:#666">mis à jour le ${ts}</small></p>
      <hr/>
      <p style="font-size:small;color:#666;">
        Vous recevez cet email car vous êtes inscrit à <a href="https://www.notif-arc.fr">NotifArc</a>.<br/>
        <a href="${process.env.APP_BASE_URL}/unsubscribe">Se désinscrire</a>
      </p>
    `;

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