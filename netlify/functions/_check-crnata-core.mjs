// Netlify Scheduled Function — NotifArc / CRNATA 18m
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { getStore } from "@netlify/blobs";

const SUBS_KEY = "subscribers.json";
const EVENTS_KEY = "last_events.json";
const URL = "https://www.crnata.fr/evenements/tags/tir-a-18m/";

function nowFR() {
    return new Date().toLocaleString("fr-FR", { timeZone: process.env.LOCAL_TZ || "Europe/Paris" });
}

export async function runCheck({ forceSend = false, dryRun = false }) {
    console.log("run crnata function - force send : ", forceSend, " - dryRun", dryRun);

    // --- scrape ---
    const res = await fetch(URL, { headers: { "User-Agent": "NotifArc Netlify Cron" } });
    if (!res.ok) return { statusCode: 500, body: "Fetch error" };
    const html = await res.text();
    const $ = cheerio.load(html);

    const ts = nowFR();
    const events = [];
    $("ul.em-tags-list li").each((_, li) => {
        const a = $(li).find("a[href]").first();
        if (!a.length) return;
        const href = String(a.attr("href") || "").trim();
        const title = a.text().trim();
        const node = a.get(0);
        const dateTxt = (node && node.nextSibling && node.nextSibling.data ? node.nextSibling.data.trim() : "Date inconnue");
        events.push([href, title, dateTxt]);
    });

    // --- état précédent ---
    let prevWrap = (await getJson(EVENTS_KEY)) || { savedAt: null, data: [] };
    const prev = prevWrap.data;
    const prevUrls = new Set(prev.map(r => r[0]));
    const newItems = events.filter(([u]) => !prevUrls.has(u));
    const knownItems = events.filter(([u]) => prevUrls.has(u));

    // première exécution ? juste snapshot si pas de FIRST_RUN_NOTIFY
    const firstRun = prev.length === 0;
    if (firstRun) {
        await setJson(EVENTS_KEY, {savedAt: ts, data: events});
        console.log("Snapshot saved (first run)");
        return { statusCode: 200,  body:"Snapshot saved (first run)" };
    }

    // rien de neuf et pas de FORCE_SEND
    if (!newItems.length && !forceSend) {
        await setJson(EVENTS_KEY, {savedAt: ts, data: events});
        console.log("No new events");
        return { statusCode: 200, body: "No new events" };
    }

    // --- construire l'email ---
    let htmlBody = "";
    if (newItems.length) {
        const newHtml = newItems.map(([u,t,d]) => `<li><a href="${u}">${t}</a> ${d}</li>`).join("");
        const knownHtml = knownItems.map(([u,t,d]) => `<li><a href="${u}">${t}</a> ${d}</li>`).join("");
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
        const allHtml = events.map(([u,t,d]) => `<li><a href="${u}">${t}</a> ${d}</li>`).join("");
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
    const toList = subs.filter(s => s.status === "confirmed").map(s => s.email);
    if (!toList.length) {
        await setJson(EVENTS_KEY, {savedAt: ts, data: events});
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
            to: "no-reply@notif-arc.fr",
            bcc: toList,
            subject: "NotifArc — Nouveaux évènements tir à 18 m",
            html: htmlBody
        })
    });
    console.log("Resend:", resp.status, await resp.text());

    await setJson(EVENTS_KEY, {savedAt: ts, data: events});
    console.log(`OK (new: ${newItems.length}, sent: ${toList.length})`);
    return { statusCode: 200, body : `OK (new: ${newItems.length}, sent: ${toList.length})` };
}

// Store
const BUCKET = "crnata-tir18m";
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