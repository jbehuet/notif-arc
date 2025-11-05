import {getJson} from "$lib/store.js";

const SUBS_KEY = 'subscribers.json';

export const load = async ({ url }) => {
    const token = url.searchParams.get("t") || "";
    if (!token) {
        return { status:"error", message:"Le lien est invalide." };
    }
    const subscribers = (await getJson(SUBS_KEY)) ?? [];
    const idx = subscribers.findIndex((u) => u.token === token);
    if (idx === -1) {
        return { status:"error", message: "Lien invalide." };
    }

    return {user : {...subscribers[idx], categories: subscribers[idx].categories} };
}