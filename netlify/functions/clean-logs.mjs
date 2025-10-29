// Netlify Scheduled Function — Clean logs
import { getStore } from "@netlify/blobs";

export async function handler() {
    const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "1";
    const res = await purgeLogs(DRY_RUN);
    return { statusCode: 200 };
}

export async function purgeLogs(dryRun = false) {
    const store = getStore({
        name: "notif-arc",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_AUTH_TOKEN
    });
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;

    // Suppression anciens logs ---
    const { blobs: logs } = await store.list({ prefix: "logs/" });
    const logsToDelete = logs.filter((b) => {
        const parts = b.key.split("_");
        const idPart = parts[1].replace(".json", "");
        const ts = Number(idPart);
        return !isNaN(ts) && ts < cutoff;
    });

    console.log(`[purge] ${logsToDelete.length} logs à supprimer (plus vieux que 48h)`);

    if (!dryRun) {
        await Promise.allSettled(toDelete.map((b) => store.delete(b.key)));
    } else {
        logsToDelete.forEach((b) => console.log("DRY-RUN →", b.key));
    }

    // Suppression complète des locks ---
    const { blobs: locks } = await store.list({ prefix: "locks/" });
    console.log(`[purge] ${locks.length} locks à supprimer`);

    if (!dryRun) {
        await Promise.allSettled(locks.map((b) => store.delete(b.key)));
    } else {
        locks.forEach((b) => console.log("   DRY-RUN →", b.key));
    }

    console.log(`[purge] Logs ${logsToDelete.length} et Locks ${locks.length} supprimés`);
    return {
        statusCode: 200,
        body: JSON.stringify({
            dryRun: dryRun,
            deletedLogs: dryRun ? 0 : logsToDelete.length,
            deletedLocks: dryRun ? 0 : locks.length
        }),
    };
}