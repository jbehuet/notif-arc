import { getStore } from "@netlify/blobs";
import { verifyToken } from "$lib/tokens";

const BUCKET = "crnata-tir18m";
const KEY = "subscribers.json";

export const load = async ({ url }) => {
    const v = verifyToken(url.searchParams.get("token") || "", process.env.SECRET_KEY);
    if (!v || v.action !== "unsubscribe") {
        return { status:"error", title:"Lien invalide", message:"Le lien est invalide ou expiré." };
    }
    const store = getStore(BUCKET);
    const raw = (await store.get(KEY, { type: "json" }));
    const list = Array.isArray(raw) ? raw : [];
    const next = list.filter(r => r.email !== v.email);
    const removed = next.length !== list.length;
    if (removed) await store.set(KEY, JSON.stringify(next, null, 2));

    return removed
        ? { status:"ok", title:"Désinscription réussie ✅", message:`${v.email} a été retiré(e) de la liste.` }
        : { status:"error", title:"Adresse introuvable", message:"Cette adresse n'était pas abonnée." };
};