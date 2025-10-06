// netlify/functions/check-crnata-manual.mjs (HTTP CLASSIQUE)
import { runCheck } from "./_check-crnata-core.mjs";

function getQueryParam(req, key) {
    return req?.queryStringParameters?.[key] ?? null;
}

export async function handler(req, ctx) {
    const force  = getQueryParam(req, "force") === "1";
    const dryRun = (getQueryParam(req, "dryRun") === "1") || (getQueryParam(req, ctx, "dry_run") === "1");

    const result = await runCheck({ forceSend: force, dryRun: dryRun });

    return result;
};