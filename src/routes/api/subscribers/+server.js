import {error, json} from '@sveltejs/kit';
import {ADMIN_TOKEN} from "$env/static/private";
import {SubscribersStore} from "$lib/shared/subscribersStore.js";
import {Bucket} from "$lib/utils/bucket.js";

export const PUT = async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim()
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
        throw error(401, 'Unauthorized');
    }

    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ message: "Email invalide." }, { status: 400 });
    }

    const status = String(body.status || "").trim();
    const subscribersStore = new SubscribersStore(Bucket());
    const subscriber = await subscribersStore.get(email);
    if (!subscriber) {
        return json({ message: "Subscriber non trouvé" });
    }

    subscriber.status = status;
    await subscribersStore.createOrUpdate(subscriber)
    return json({ status: 200, message: "Subscriber updated" })
}

export const DELETE = async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim()
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
        throw error(401, 'Unauthorized');
    }

    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return json({ message: "Email invalide." }, { status: 400 });
    }

    const subscribersStore = new SubscribersStore(Bucket())
    await subscribersStore.delete(email);

    return json({ status: 200, message:  `${email} supprimé` });
}