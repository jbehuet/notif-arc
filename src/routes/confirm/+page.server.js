import { verifyToken, newManageToken } from "$lib/tokens";
import { getJson, setJson } from "$lib/store";
import { emailFooter } from "$lib/shared/email";
import {RESEND_API_KEY, RESEND_FROM, SECRET_KEY, USE_LOCAL_STORE, DRY_RUN} from '$env/static/private';

const EVENTS_KEY = 'nouvelle_aquitaine_events.json';
const SUBS_KEY = "subscribers.json";
const useLocalStore = USE_LOCAL_STORE === "1";

export const load = async ({ url }) => {
    const v = verifyToken(url.searchParams.get("token") || "", SECRET_KEY);
    if (!v || v.action !== "confirm") {
        return { status:"error", title:"Lien invalide", message:"Le lien est invalide ou expiré." };
    }

    const list = (await getJson(SUBS_KEY, useLocalStore)) ?? [];
    const idx = list.findIndex(r => r.email === v.email);
    if (idx === -1) return { status:"error", title:"Adresse introuvable", message:"Cette adresse n'existe pas." };

    if (list[idx].status !== "confirmed") {
        list[idx] = { ...list[idx], status:"confirmed", token: newManageToken(), confirmedAt: Date.now() };
        await setJson(SUBS_KEY, list,useLocalStore);
    }

    let content = (await getJson(EVENTS_KEY, useLocalStore)) ?? { savedAt: null, tir18m: [] };
    // envoi mail avec les evenements existants
    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: RESEND_FROM,
            to: [v.email],
            subject: "NotifArc — Mandats",
            headers: {
                'List-Unsubscribe': `<https://www.notif-arc.fr/unsubscribe?t=${list[idx].token}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            },
            html: `
             <header>
                <a href="https://www.notif-arc.fr" style="display:flex;align-items:center;font-size: 2rem;color: #3a9092;text-decoration:none;">
                    <img src="https://www.notif-arc.fr/notif-arc-logo-512.png" width="68" alt="logo">
                    <strong>NotifArc</strong>
                </a> 
                <p style="margin:0 0 2rem 0;font-size:1rem;color:#646b79;font-style:italic;">Ne manquez plus aucune compétition.</p>
            </header>
            <div>
                <h2>Événements tir à 18 m</h2>
            </div>
            <h4>Déjà connus :</h4>
            <ul>
                 ${content.tir18m.map((e) => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("")}
            </ul>
            <p><small style="color:#666">mis à jour le ${content.savedAt}</small></p>
            <hr/>
            ${emailFooter(list[idx].token)}
            `
        })
    });

    return { status:"ok", title:"Inscription confirmée 🎉", message:"Vous recevrez désormais les alertes NotifArc.", email:v.email };
};
