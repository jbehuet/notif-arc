import {Bucket} from '$lib/utils/bucket.js';
import {EventsStore} from "$lib/shared/eventsStore.js";

export const load = async () => {
    const eventsStore = new EventsStore(Bucket())
    let content = await eventsStore.get();
    return {
        events: content,
        savedAt: content.savedAt,
    };
};