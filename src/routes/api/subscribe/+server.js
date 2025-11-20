import { json } from '@sveltejs/kit';
import { signToken } from '$lib/utils/tokens.js';
import {Bucket } from '$lib/utils/bucket.js';
import {
    SECRET_KEY,
    APP_BASE_URL,
    RESEND_API_KEY,
    RESEND_FROM,
} from '$env/static/private';
import {SubscribersStore} from "$lib/shared/subscribersStore.js";
import {emailHeader} from "$lib/shared/email.js";

export const POST = async ({ request, url }) => {
    const body = await request.json().catch(() => ({}));
    const clean = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return json({ message: "Email invalide." }, { status: 400 });
    }

    const subscribersStore = new SubscribersStore(Bucket())
    const subscriber = subscribersStore.get(clean)

    if (subscriber && subscriber.status === 'confirmed') {
        // Déjà inscrit
        return json({ message: "Email déjà inscrit et confirmé." });
    }

    await subscribersStore.createOrUpdate({ email: clean, status: "pending", categories: body.categories, ts: Date.now() })

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
            ${emailHeader()}
            <p>Bonjour,</p>
            <p>Pour finaliser votre souscription à <a href="https://www.notif-arc.fr">NotifArc</a> merci de confirmer votre email :</p>
            <p><a href="${link}">Confirmer mon email</a></p>`
        })
    });

    return json({ message: "Vérifiez votre boîte mail pour confirmer." });
};
