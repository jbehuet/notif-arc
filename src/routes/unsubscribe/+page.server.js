import { USE_LOCAL_STORE } from '$env/static/private';
import { getJson, setJson } from '$lib/store.js';

const SUBS_KEY = 'subscribers.json';

const useLocalStore = USE_LOCAL_STORE === "1";

export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const email = String(data.get('email') || '').trim().toLowerCase();

        if (!email) {
            return { success: false, message: "Veuillez saisir un email." };
        }

        const list = (await getJson(SUBS_KEY, useLocalStore)) ?? [];
        const next = list.filter((s) => s.email !== email);

        if (next.length === list.length) {
            return { success: false, message: "Adresse non trouvée dans nos abonnés." };
        }

        await setJson(SUBS_KEY, next, useLocalStore);
        return { success: true, message: `${email} a bien été désinscrit.` };
    }
};