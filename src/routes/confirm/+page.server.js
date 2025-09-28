import { verifyToken } from "$lib/tokens";
import { getJson, setJson } from "$lib/store";
import {SECRET_KEY, USE_LOCAL_STORE} from '$env/static/private';

const SUBS_KEY = "subscribers.json";
const useLocalStore = USE_LOCAL_STORE == "1";

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

    return { status:"ok", title:"Inscription confirmée 🎉", message:"Vous recevrez désormais les alertes NotifArc.", email:v.email };
};
