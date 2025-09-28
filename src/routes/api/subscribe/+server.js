import { getStore } from "@netlify/blobs";
import { signToken } from "$lib/tokens.js";

const BUCKET = "crnata-tir18m";
const KEY = "subscribers.json";

export const POST = async ({ request, url }) => {
    const body = await request.json().catch(() => ({}));
    const clean = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const honey = String(body.honey || "");
    if (honey) return new Response(JSON.stringify({ message: "OK." }), { status: 200 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return new Response(JSON.stringify({ message: "Email invalide." }), { status: 400 });
    }

    const store = getStore(BUCKET);
    const raw = (await store.get(KEY, { type: "json" }));
    const list = Array.isArray(raw) ? raw : [];
    const now = Date.now();
    const rec = { email: clean, name, status: "pending", ts: now };
    const next = [...list.filter(r => r.email !== clean), rec];
    await store.set(KEY, JSON.stringify(next, null, 2));

    const base = process.env.APP_BASE_URL || url.origin;
    const token = signToken(clean, "confirm", process.env.SECRET_KEY);
    const link = `${base}/confirm?token=${token}`;

    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type":"application/json" },
        body: JSON.stringify({
            from: process.env.RESEND_FROM,
            to: [clean],
            subject: "Confirme ton inscription — NotifArc",
            html: `<p>Bonjour${name ? " " + name : ""},</p>
             <p>Merci pour ton inscription à NotifArc.</p>
             <p><a href="${link}">Clique ici pour confirmer ton abonnement</a></p>
             <p>Si tu n'es pas à l'origine de cette demande, ignore ce message.</p>`
        })
    });

    return new Response(JSON.stringify({ message: "Vérifiez votre boîte mail pour confirmer." }), { status: 200 });
};