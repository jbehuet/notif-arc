import { getJson } from '$lib/store.js';
import { ADMIN_TOKEN, USE_LOCAL_STORE } from '$env/static/private';

const EVENTS_KEY = 'last_events.json';
const useLocalStore = USE_LOCAL_STORE === "1";

export const load = async ({ url }) => {
    const token = url.searchParams.get('token') || '';
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
        return {
            status: 401,
            error: 'Unauthorized',
            subscribers: [],
            meta: { total: 0, confirmed: 0, pending: 0 }
        };
    }

    let content = (await getJson(EVENTS_KEY, useLocalStore)) ?? { savedAt: null, data: [] };
    return {
        events: content.data,
        savedAt: content.savedAt,
        meta: { total: content.data.length },
        token
    };
};