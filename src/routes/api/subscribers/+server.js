import {error, json} from '@sveltejs/kit';
import {ADMIN_TOKEN, APP_BASE_URL, RESEND_API_KEY, RESEND_FROM, SECRET_KEY} from "$env/static/private";
import {SubscribersStore} from "$lib/shared/subscribersStore.js";
import {Bucket} from "$lib/utils/bucket.js";
import {signToken} from "$lib/utils/tokens.js";
import {emailHeader} from "$lib/shared/email.js";

export const PUT = async ({ request, url }) => {
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

    if (status === "unsubscribed") {
        const subscribersStore = new SubscribersStore(Bucket());
        const subscriber = await subscribersStore.get(email);
        if (!subscriber) {
            return json({ message: "Subscriber non trouvé" });
        }

        subscriber.status = status;
        await subscribersStore.createOrUpdate(subscriber)
    } else if (status === "pending") {
        const token = signToken(email, "confirm", SECRET_KEY);
        const link = `${APP_BASE_URL || url.origin}/confirm?token=${token}`;

        await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: RESEND_FROM,
                to: [email],
                subject: "[Rappel] Confirmez votre souscription — NotifArc",
                html: `
            ${emailHeader()}
            <p>Bonjour,</p>
            <p>Il ne vous reste plus qu’une étape pour activer votre souscription à <a href="https://www.notif-arc.fr">NotifArc</a> confirmez votre adresse e-mail en cliquant sur le lien suivant :</p>
            <p><a href="${link}">Confirmer mon email</a></p>`
            })
        });
    }

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