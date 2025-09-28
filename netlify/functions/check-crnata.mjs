// Netlify Scheduled Function — NotifArc / CRNATA 18m
import fetch from "node-fetch";
import * as cheerio from "cheerio";

// IMPORTANT: on réutilise le même wrapper que côté SvelteKit
import { getJson, setJson } from "../../src/lib/store.js";
import { signToken } from "../../src/lib/tokens.js";

const base = process.env.APP_BASE_URL;
const secret = process.env.SECRET_KEY;

const SUBS_KEY = "subscribers.json";
const EVENTS_KEY = "last_events.json";
const URL = "https://www.crnata.fr/evenements/tags/tir-a-18m/";
const USE_LOCAL_STORE = process.env.USE_LOCAL_STORE  == "1"

function nowFR() {
    return new Date().toLocaleString("fr-FR", { timeZone: process.env.LOCAL_TZ || "Europe/Paris" });
}

export async function handler() {
    // --- scrape ---
    const res = await fetch(URL, { headers: { "User-Agent": "NotifArc Netlify Cron" } });
    if (!res.ok) return { statusCode: 500, body: "Fetch error" };
    const html = await res.text();
    const $ = cheerio.load(html);

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
    const prev = (await getJson(EVENTS_KEY, USE_LOCAL_STORE)) || [];
    const prevUrls = new Set(prev.map(r => r[0]));
    const newItems = events.filter(([u]) => !prevUrls.has(u));
    const knownItems = events.filter(([u]) => prevUrls.has(u));

    // première exécution ? juste snapshot si pas de FIRST_RUN_NOTIFY
    const firstRun = prev.length === 0;
    if (firstRun && !process.env.FIRST_RUN_NOTIFY) {
        await setJson(EVENTS_KEY, events, USE_LOCAL_STORE);
        return { statusCode: 200, body: "Snapshot saved (first run)" };
    }

    // rien de neuf et pas de FORCE_SEND
    if (!newItems.length && !process.env.FORCE_SEND) {
        await setJson(EVENTS_KEY, events);
        return { statusCode: 200, body: "No new events" };
    }

    // --- construire l'email ---
    const ts = nowFR();
    let htmlBody = "";
    if (newItems.length) {
        const newHtml = newItems.map(([u,t,d]) => `<li><a href="${u}">${t}</a> — ${d}</li>`).join("");
        const knownHtml = knownItems.map(([u,t,d]) => `<li><a href="${u}">${t}</a> — ${d}</li>`).join("");
        htmlBody = `
      <div>
        <h3>Événements tir à 18 m — Nouveautés</h3>
        <small style="color:#666">mis à jour le ${ts}</small>
      </div>
      <h4>Nouveaux :</h4>
      <ul>${newHtml}</ul>
      <h4>Déjà connus :</h4>
      <ul>${knownHtml}</ul>
      <hr/>
      <p style="font-size:small;color:#666;">
        Vous recevez cet email car vous êtes inscrit à NotifArc.<br/>
        <a href="${process.env.APP_BASE_URL}/unsubscribe">Se désinscrire</a>
      </p>
    `;
    } else {
        const allHtml = events.map(([u,t,d]) => `<li><a href="${u}">${t}</a> — ${d}</li>`).join("");
        htmlBody = `
      <div>
        <h3>Pas de nouveauté — envoi manuel</h3>
        <small style="color:#666">mis à jour le ${ts}</small>
      </div>
      <ul>${allHtml}</ul>
      <hr/>
      <p style="font-size:small;color:#666;">
        Vous recevez cet email car vous êtes inscrit à NotifArc.<br/>
        <a href="${process.env.APP_BASE_URL}/unsubscribe">Se désinscrire</a>
      </p>
    `;
    }

    // --- destinataires ---
    const subs = (await getJson(SUBS_KEY, USE_LOCAL_STORE )) || [];
    const toList = subs.filter(s => s.status === "confirmed").map(s => s.email);
    if (!toList.length) {
        await setJson(EVENTS_KEY, events, USE_LOCAL_STORE);
        return { statusCode: 200, body: "No confirmed subscribers" };
    }

    // --- envoi via Resend ---
    const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "1";
    if (DRY_RUN) {
        console.log("DRY_RUN: preview only\n", htmlBody);
    } else {
        const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                from: process.env.RESEND_FROM,
                bcc: toList,
                subject: "NotifArc — Nouveaux événements tir à 18 m",
                html: htmlBody
            })
        });
        console.log("Resend:", resp.status, await resp.text());
    }

    await setJson(EVENTS_KEY, events, USE_LOCAL_STORE);
    return { statusCode: 200, body: `OK (new: ${newItems.length}, sent: ${toList.length})` };
}

// active la planification automatiquement en prod Netlify
export const config = { schedule: "0 6,12,18 * * *" };
