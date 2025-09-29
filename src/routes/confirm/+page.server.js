import { verifyToken } from "$lib/tokens";
import { getJson, setJson } from "$lib/store";
import {RESEND_API_KEY, RESEND_FROM, SECRET_KEY, USE_LOCAL_STORE, DRY_RUN} from '$env/static/private';

const EVENTS_KEY = 'last_events.json';
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
        list[idx] = { ...list[idx], status:"confirmed", confirmedAt: Date.now() };
        await setJson(SUBS_KEY, list,useLocalStore);
    }

    let content = (await getJson(EVENTS_KEY, useLocalStore)) ?? { savedAt: null, data: [] };

    const events = content.data;
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
            subject: "NotifArc — évènements tir à 18 m",
            html: `
            <div>
                <h3>Événements tir à 18 m</h3>
            </div>
            <h4>Déjà connus :</h4>
            <ul>
                 ${events.map((s) => `<li><a href="${s[0]}" target="_blank">${s[1]}</a> ${s[2]}</li>`).join("")}
            </ul>
            <p><small style="color:#666">mis à jour le ${content.savedAt}</small></p>
            <hr/>
            <p style="font-size:small;color:#666;">
            Vous recevez cet email car vous êtes inscrit à <a href="https://www.notif-arc.fr">NotifArc</a>.<br/>
            <a href="${process.env.APP_BASE_URL}/unsubscribe">Se désinscrire</a>
            </p>
      `
        })
    });

    return { status:"ok", title:"Inscription confirmée 🎉", message:"Vous recevrez désormais les alertes NotifArc.", email:v.email };
};
