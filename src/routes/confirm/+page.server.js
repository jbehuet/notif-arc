import { getStore } from "@netlify/blobs";
import { verifyToken } from "$lib/tokens.js";

const BUCKET = "crnata-tir18m";
const KEY = "subscribers.json";

export const load = async ({ url }) => {
    const v = verifyToken(url.searchParams.get("token") || "", process.env.SECRET_KEY);
    if (!v || v.action !== "confirm") {
        return { status:"error", title:"Lien invalide", message:"Le lien est invalide ou expiré." };
    }

    const store = getStore(BUCKET);
    const raw = (await store.get(KEY, { type: "json" }));
    const list = Array.isArray(raw) ? raw : [];
    const idx = list.findIndex(r => r.email === v.email);
    if (idx === -1) return { status:"error", title:"Adresse introuvable", message:"Cette adresse n'existe pas." };

    if (list[idx].status !== "confirmed") list[idx] = { ...list[idx], status:"confirmed", confirmedAt: Date.now() };
    await store.set(KEY, JSON.stringify(list, null, 2));

    return { status:"ok", title:"Inscription confirmée 🎉", message:"Vous recevrez désormais les alertes NotifArc.", email:v.email };
};