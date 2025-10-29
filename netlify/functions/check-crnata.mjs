// Netlify Scheduled Function — NotifArc / CRNATA 18m
import { runCheck } from "./_check-crnata-core.mjs";
import { getStore } from "@netlify/blobs";

export async function handler() {
    const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "1";
    await runCheck({dryRun: DRY_RUN, slot})
    return { statusCode: 200};
}