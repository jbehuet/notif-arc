// Netlify Scheduled Function — NotifArc / CRNATA 18m
import { runCheck } from "./_check-crnata-core.mjs";
import { getStore } from "@netlify/blobs";

export async function handler() {
    const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "1";

    if (!["production"].includes(process.env.CONTEXT)) {
        console.log("⏸Cron ignoré : contexte =", process.env.CONTEXT);
        return { statusCode: 200, body: "skip non-production" };
    }

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
    const runId = `${now.toISOString()}-${Math.random().toString(36).slice(2, 8)}`;

    // si déjà présent, on stoppe immédiatement
    const existing = await store.get(lockKey);
    if (existing?.data) {
        console.log("Skip: déjà exécuté pour cette heure", slot);
        await store.set(`logs/logs_${Date.now()}_${slot}_WARN.json`, `duplicate run skipped for ${slot}`);
        return { statusCode: 200, body: `already run for ${slot}` };
    }

    // on écrit notre runId
    await store.set(lockKey, runId);

    // petite latence
    await new Promise((r) => setTimeout(r, 400));

    const check = await store.get(lockKey);
    const current = check?.data?.toString();
    if (current !== runId) {
        console.log("Skip: lock perdu (autre run a la main)", { slot, ours: runId, theirs: current });
        await store.set(`logs/logs_${Date.now()}_${slot}_WARN.json`, `lost lock race for ${slot}`);
        return { statusCode: 200, body: `lost lock race for ${slot}` };
    }

    console.log("Lock posé pour", slot, "runId:", runId);
    // --- Fin du verrou ---

    await runCheck({dryRun: DRY_RUN, slot})
    return { statusCode: 200};
}