import { getJson } from '$lib/store.js';
import { ADMIN_TOKEN, USE_LOCAL_STORE } from '$env/static/private';

const SUBS_KEY = 'subscribers.json';
const useLocalStore = USE_LOCAL_STORE == "1";

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

    const list = (await getJson(SUBS_KEY, useLocalStore)) ?? [];
    const confirmed = list.filter((s) => s.status === 'confirmed').length;
    const pending = list.filter((s) => s.status !== 'confirmed').length;

    // Tri simple par statut puis par date
    list.sort((a, b) => {
        if (a.status === b.status) return (b.ts || 0) - (a.ts || 0);
        return a.status === 'confirmed' ? -1 : 1;
    });

    return {
        subscribers: list,
        meta: { total: list.length, confirmed, pending },
        token
    };
};