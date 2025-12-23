import {ADMIN_TOKEN} from "$env/static/private";
import {error, json} from "@sveltejs/kit";
import {Bucket} from "$lib/utils/bucket.js";
import {EventsStore} from "$lib/shared/eventsStore.js";

export const DELETE = async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim()
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
        throw error(401, 'Unauthorized');
    }

    const category = String(body.category || "")
    const url = String(body.url || "")
    const eventsStore = new EventsStore(Bucket())
    await eventsStore.delete(category, url);

    return json({ status: 200, message:  `${category} - ${url} supprimé` });
}