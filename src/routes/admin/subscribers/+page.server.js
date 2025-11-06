import { ADMIN_TOKEN } from '$env/static/private';
import { Bucket } from '$lib/utils/bucket.js';
import {SubscribersStore} from "$lib/shared/subscribersStore.js";
import {error} from "@sveltejs/kit";

export const load = async ({ url }) => {
    const token = url.searchParams.get('token') || '';
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
        throw error(401, 'Unauthorized');
    }

    const subscribersStore = new SubscribersStore(Bucket())
    const list = await subscribersStore.list()

    const confirmed = list.filter((s) => s.status === 'confirmed').length;
    const pending = list.filter((s) => s.status === 'pending').length;
    const unsubscribed = list.filter((s) => s.status === 'unsubscribed').length;

    // Tri simple par date
    list.sort((a, b) => {
        return (b.ts || 0) - (a.ts || 0);
    });

    return {
        subscribers: list,
        meta: { total: list.length, confirmed, pending, unsubscribed },
        token
    };
};