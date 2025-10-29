// netlify/functions/check-crnata-manual.mjs (HTTP CLASSIQUE)
import { runCheck } from "./_check-crnata-core.mjs";

export async function handler() {
    return await runCheck({dryRun: true, slot: "MANUAL" });
}