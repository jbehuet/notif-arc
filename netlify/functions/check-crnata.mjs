// Netlify Scheduled Function — NotifArc / CRNATA 18m
import { runCheck } from "./_check-crnata-core.mjs";
import { getStore } from "@netlify/blobs";

export async function handler() {
    // --- LOCK ANTI-DOUBLE EXECUTION ---
    const store = getStore({
        name: "notif-arc",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_AUTH_TOKEN,
    });

    // clé basée sur l'heure UTC
    const slot = new Date().toISOString().slice(0, 13); // ex: 2025-10-30T13
    const lockKey = `locks/${slot}`;

    // si déjà présent → on arrête
    const existing = await store.get(lockKey);
    if (existing?.data) {
        console.log(`Skip: déjà exécuté pour ${slot}`);
        return { statusCode: 200, body: `skip: already run for ${slot}` };
    }

    // sinon, on pose le lock
    await store.set(lockKey, String(Date.now()));
    console.log(`Lock posé pour ${slot}`);
    // --- FIN DU LOCK ---

    const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "1";
    return await runCheck({dryRun: DRY_RUN });
}