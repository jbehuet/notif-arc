import {error} from "@sveltejs/kit";
import { ADMIN_TOKEN } from '$env/static/private';
import {Bucket} from '$lib/utils/bucket.js';
import {EventsStore} from "$lib/shared/eventsStore.js";

export const load = async ({ url }) => {
    const token = url.searchParams.get('token') || '';
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
        throw error(401, 'Unauthorized');
    }

    const eventsStore = new EventsStore(Bucket())
    let content = await eventsStore.get();
    return {
        events: content,
        savedAt: content.savedAt,
        token
    };
};
