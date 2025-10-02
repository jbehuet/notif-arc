import { getJson } from '$lib/store.js';
import { USE_LOCAL_STORE } from '$env/static/private';

const EVENTS_KEY = 'last_events.json';
const useLocalStore = USE_LOCAL_STORE === "1";

export const load = async ({ url }) => {
    let content = (await getJson(EVENTS_KEY, useLocalStore)) ?? { savedAt: null, data: [] };
    return {
        events: content.data,
        savedAt: content.savedAt,
        meta: { total: content.data.length }
    };
};