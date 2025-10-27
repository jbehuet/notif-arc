// Netlify Scheduled Function — Clean logs
import { getStore } from "@netlify/blobs";

export async function handler() {
    const res = await purgeLogs(false)
    return { statusCode: 200, body: JSON.stringify(res) };
}

export async function purgeLogs(dryRun = false) {
    const store = getStore({
        name: "notif-arc",
        siteID: process.env.NETLIFY_SITE_ID,
        token: process.env.NETLIFY_AUTH_TOKEN
    });
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;

    const { blobs } = await store.list({ prefix: "logs_" });
    if (!blobs?.length) {
        console.log("Aucun blob trouvé avec le préfixe logs_");
        return { matched: 0, deleted: 0 };
    }

    const toDelete = blobs.filter((b) => {
        const parts = b.key.split("_");
        const idPart = parts[1].replace(".json", "");
        const ts = Number(idPart);
        return !isNaN(ts) && ts < cutoff;
    });

    console.log(`[purge] ${toDelete.length} logs à supprimer (plus vieux que 48h)`);

    if (dryRun) {
        toDelete.forEach((b) =>
            console.log(`DRY-RUN → ${b.key} (modifié le ${b.last_modified})`)
        );
        return { matched: toDelete.length, deleted: 0, dryRun: true };
    }

    const results = await Promise.allSettled(
        toDelete.map((b) => store.delete(b.key))
    );

    const deleted = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - deleted;

    console.log(`[purge] Supprimé ${deleted}/${results.length} blobs`);
    if (failed) console.warn(`[purge] ${failed} échecs de suppression.`);

    return { matched: toDelete.length, deleted, dryRun: false };
}