// netlify/functions/check-crnata-manual.mjs (HTTP CLASSIQUE)
import { runCheck } from "./_check-crnata-core.mjs";

function getQueryParam(req, ctx, key) {
    // 1) Essayer l’URL absolue
    try {
        const proto = req.headers?.get?.("x-forwarded-proto") || "http";
        const host  = req.headers?.get?.("x-forwarded-host") || "localhost";
        const abs   = new URL(req.url || "/", `${proto}://${host}`);
        const v = abs.searchParams.get(key);
        if (v !== null) return v;
    } catch {}

    // 2) Essayer l’en-tête Netlify Dev
    try {
        const raw = req.headers?.get?.("x-nf-query-string");
        if (raw) {
            const sp = new URLSearchParams(raw);
            const v = sp.get(key);
            if (v !== null) return v;
        }
    } catch {}

    // 3) Fallback style v1
    return ctx?.queryStringParameters?.[key] ?? null;
}

export async function handler(req, ctx) {
    const force  = getQueryParam(req, ctx, "force") === "1";
    const dryRun = (getQueryParam(req, ctx, "dryRun") === "1") || (getQueryParam(req, ctx, "dry_run") === "1");

    const result = await runCheck({ forceSend: force, dryRun: dryRun });

    return result;
};