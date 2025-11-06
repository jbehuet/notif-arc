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
            <header>
                <a href="https://www.notif-arc.fr" style="display:flex;align-items:center;font-size: 2rem;color: #3a9092;text-decoration:none;">
                    <img src="https://www.notif-arc.fr/notif-arc-logo-512.png" width="68" alt="logo">
                    <strong>NotifArc</strong>
                </a> 
                <p style="margin:0 0 2rem 0;font-size:1rem;color:#646b79;font-style:italic;">Ne manquez plus aucune compétition.</p>
            </header>
            <p>Bonjour,</p>
            <p>Pour finaliser votre souscription à <a href="https://www.notif-arc.fr">NotifArc</a> merci de confirmer votre email :</p>
            <p><a href="${link}">Confirmer mon email</a></p>`
        })
    });

    return json({ message: "Vérifiez votre boîte mail pour confirmer." });
};
