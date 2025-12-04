import { json } from '@sveltejs/kit';
import {Bucket} from '$lib/utils/bucket.js';
import {SubscribersStore} from "$lib/shared/subscribersStore.js";

export const POST = async ({ request, url }) => {
    const body = await request.json().catch(() => ({}));
    const clean = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return json({ message: "Email invalide." }, { status: 400 });
    }
    const token = String(body.token || "").trim();

    const subscribersStore = new SubscribersStore(Bucket())
    const subscriber = await subscribersStore.get(clean);
    if (!subscriber) {
        // n'existe pas
        return json({ message: "Cet email n'existe pas." });
    }

    if (subscriber.token != token){
        return json({ message: "Ce token est invalide." });
    }

    subscriber.categories = body.categories;
    await subscribersStore.createOrUpdate(subscriber);
    return json({ message: "Vos préférences ont bien été enregistrées." });
};
