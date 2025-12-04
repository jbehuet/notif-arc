import { USE_LOCAL_STORE } from '$env/static/private';
import {Bucket} from '$lib/utils/bucket.js';
import {SubscribersStore} from "$lib/shared/subscribersStore.js";

export const load = async ({ url }) => {
    const token = url.searchParams.get("t") || "";
    if (!token) {
        return { status:"error", message:"Le lien est invalide." };
    }

    const subscribersStore = new SubscribersStore(Bucket())
    const subscriber = await subscribersStore.getByToken(token)

    if (!subscriber) {
        return { status:"error", message: "Lien invalide ou déjà désinscrit." };
    }

    await subscribersStore.createOrUpdate({...subscriber, status: "unsubscribed"});
    return { status:"success", message: `${subscriber.email} a bien été désinscrit.`, email: subscriber.email };
}