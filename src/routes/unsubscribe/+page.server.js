import { USE_LOCAL_STORE } from '$env/static/private';
import { getJson, setJson } from '$lib/store.js';

const SUBS_KEY = 'subscribers.json';

const useLocalStore = USE_LOCAL_STORE === "1";

export const load = async ({ url }) => {
    const token = url.searchParams.get("t") || "";
    if (!token) {
        return { status:"error", message:"Le lien est invalide." };
    }
    const subscribers = (await getJson(SUBS_KEY, useLocalStore)) ?? [];
    const idx = subscribers.findIndex((u) => u.token === token);
    if (idx === -1) {
        return { status:"error", message: "Lien invalide ou déjà désinscrit." };
    }

    const email = subscribers[idx]?.email ?? '';
    const next = subscribers.filter((_, i) => i !== idx);
    await setJson(SUBS_KEY, next, useLocalStore);
    return { status:"success", message: `${email} a bien été désinscrit.`, email };
}