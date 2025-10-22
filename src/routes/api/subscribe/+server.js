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
const useLocalStore = USE_LOCAL_STORE === "1";

export const POST = async ({ request, url }) => {
    const body = await request.json().catch(() => ({}));
    const clean = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return json({ message: "Email invalide." }, { status: 400 });
    }

    const list = (await getJson(SUBS_KEY, useLocalStore)) ?? [];
    const idx = list.findIndex(r => r.email === clean && r.status === "confirmed");
    if (idx > -1){
        // Déjà inscrit
        return json({ message: "Email déjà inscrit et confirmé." });
    }

    const rec = { email: clean, status: "pending", categories: body.categories, ts: Date.now() };
    await setJson(SUBS_KEY, [...list.filter(r => r.email !== clean), rec], useLocalStore);

    const token = signToken(clean, "confirm", SECRET_KEY);
    const link = `${APP_BASE_URL || url.origin}/confirm?token=${token}`;

    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: RESEND_FROM,
            to: [clean],
            subject: "Confirmez votre souscription — NotifArc",
            html: `
            <p>Bonjour,</p>
            <p>Pour finaliser votre souscription à <a href="https://www.notif-arc.fr">NotifArc</a> merci de confirmer votre email :</p>
            <p><a href="${link}">Confirmer mon email</a></p>`
        })
    });

    return json({ message: "Vérifiez votre boîte mail pour confirmer." });
};
