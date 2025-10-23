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
    const prevUrls = new Set(newWrap.map(e => e.href));

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