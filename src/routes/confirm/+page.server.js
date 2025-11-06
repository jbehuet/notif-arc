import { verifyToken, newManageToken } from "$lib/utils/tokens.js";
import {Bucket} from "$lib/utils/bucket.js";
import { emailFooter } from "$lib/shared/email";
import {RESEND_API_KEY, RESEND_FROM, SECRET_KEY} from '$env/static/private';
import {SubscribersStore} from "$lib/shared/subscribersStore.js";
import {EventsStore} from "$lib/shared/eventsStore.js";
import {CATEGORIES} from "$lib/shared/categories.js";

export const load = async ({ url }) => {
    const v = verifyToken(url.searchParams.get("token") || "", SECRET_KEY);
    if (!v || v.action !== "confirm") {
        return { status:"error", title:"Lien invalide", message:"Le lien est invalide ou expiré." };
    }

    const token = await newManageToken();
    const subscribersStore = new SubscribersStore(Bucket())
    const subscriber = await subscribersStore.get(v.email)

    if (!subscriber) return { status:"error", title:"Adresse introuvable", message:"Cette adresse n'existe pas." };

    if (subscriber.status !== "confirmed") {
        await subscribersStore.createOrUpdate( { ...subscriber, status:"confirmed", token: token, confirmedAt: Date.now() });
    }

    const eventsStore = new EventsStore(Bucket())
    let content = await eventsStore.get();
    // envoi mail avec les evenements existants
    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: RESEND_FROM,
            to: [v.email],
            subject: "NotifArc — Mandats",
            headers: {
                'List-Unsubscribe': `<https://www.notif-arc.fr/unsubscribe?t=${subscriber.token}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
            },
            html: `
             <header>
                <a href="https://www.notif-arc.fr" style="display:flex;align-items:center;font-size: 2rem;color: #3a9092;text-decoration:none;">
                    <img src="https://www.notif-arc.fr/notif-arc-logo-512.png" width="68" alt="logo">
                    <strong>NotifArc</strong>
                </a> 
                <p style="margin:0 0 2rem 0;font-size:1rem;color:#646b79;font-style:italic;">Ne manquez plus aucune compétition.</p>
            </header>
            ${subscriber.categories.filter(slug => content[slug].length > 0 ).map(slug => {
                const category = CATEGORIES.find(c => c.slug == slug);
                return `<hr />
                        <div><h3>Mandat ${category.emoji + " " + category.label}</h3></div>
                        <h4>Déjà connus :</h4>
                        <ul>${content[slug].map( e => `<li><a href="${e.href}">${e.title}</a> ${e.date}</li>`).join("")}</ul>
                     `;
            }).join("")}
            <p><small style="color:#666">mis à jour le ${content.savedAt}</small></p>
            <hr/>
            ${emailFooter(token)}
            `
        })
    });

    return { status:"ok", title:"Inscription confirmée 🎉", message:"Vous recevrez désormais les alertes NotifArc.", email:v.email };
};
