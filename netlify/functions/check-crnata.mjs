// Netlify Scheduled Function — NotifArc / CRNATA 18m
import { runCheck } from "./_check-crnata-core.mjs";

export async function handler() {
    const FORCE_SEND = String(process.env.FORCE_SEND || "").toLowerCase() === "1";
    const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "1";
    await runCheck({forceSend: FORCE_SEND, dryRun: DRY_RUN})
        return { statusCode: 200};
}