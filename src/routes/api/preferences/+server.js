import { json } from '@sveltejs/kit';
import { signToken } from '$lib/tokens';
import { getJson, setJson } from '$lib/store';
import {
    SECRET_KEY,
    APP_BASE_URL,
    RESEND_API_KEY,
    RESEND_FROM,
    USE_LOCAL_STORE
} from '$env/static/private';

const SUBS_KEY = "subscribers.json";

export const POST = async ({ request, url }) => {
    const body = await request.json().catch(() => ({}));
    const clean = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return json({ message: "Email invalide." }, { status: 400 });
    }
    const token = String(body.token || "").trim();

    const list = (await getJson(SUBS_KEY)) ?? [];
    const idx = list.findIndex(r => r.email === clean && r.token === token );
    if (idx == -1){
        // n'existe pas
        return json({ message: "Cet email n'existe pas." });
    }

    const rec = list[idx]
    rec.categories = body.categories
    await setJson(SUBS_KEY, [...list.filter(r => r.email !== clean), rec]);
    return json({ message: "Vos préférences ont bien été enregistrées." });
};
