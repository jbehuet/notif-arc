import {Bucket} from "$lib/utils/bucket.js";
import {SubscribersStore} from "$lib/shared/subscribersStore.js";

export const load = async ({ url }) => {
    const token = url.searchParams.get("t") || "";
    if (!token) {
        return { status:"error", message:"Le lien est invalide." };
    }

    const subscribersStore = new SubscribersStore(Bucket())
    const subscriber = await subscribersStore.getByToken(token)
    if (!subscriber) {
        return { status:"error", message: "Lien invalide." };
    }

    return {user : {...subscriber, categories: subscriber.categories} };
}