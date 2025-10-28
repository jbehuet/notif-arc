// Netlify Scheduled Function — NotifArc / CRNATA 18m
import { runCheck } from "./_check-crnata-core.mjs";
import { getStore } from "@netlify/blobs";

export async function handler() {
    const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "1";

    // --- Début du verrou (lock par heure UTC) ---
    const store = getStore({
        name: "notif-arc",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_AUTH_TOKEN,
    });

    // Clé basée sur l'heure UTC, ex : "2025-10-28T11"
    const now = new Date();
    const slot = now.toISOString().slice(0, 13); // ex: "2025-10-28T11"
    const lockKey = `locks/${slot}`;

    const existing = await store.get(lockKey);
    if (existing?.data) {
        console.log("Skip: déjà exécuté pour cette heure", slot);
        await store.set(`logs_${Date.now()}_WARN.json`, `duplicate run skipped for ${slot}`)
        return { statusCode: 200, body: `duplicate run skipped for ${slot}` };
    }

    // On pose le lock (timestamp en contenu)
    await store.set(lockKey, String(Date.now()), { contentType: "text/plain" });
    console.log("Lock posé pour", slot);
    // --- Fin du verrou ---

    await runCheck({dryRun: DRY_RUN})
    return { statusCode: 200};
}