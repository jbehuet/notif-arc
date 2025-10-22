import { getJson } from '$lib/store.js';
import { USE_LOCAL_STORE } from '$env/static/private';

const EVENTS_KEY = 'nouvelle_aquitaine_events.json';
const useLocalStore = USE_LOCAL_STORE === "1";

export const load = async () => {
    let content = (await getJson(EVENTS_KEY, useLocalStore)) ?? { savedAt: null, tir18m: [] };
    return {
        events: content.tir18m,
        savedAt: content.savedAt,
        meta: { total: content.tir18m.length }
    };
};