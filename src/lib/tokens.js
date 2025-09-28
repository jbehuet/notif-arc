import crypto from "node:crypto";

export function signToken(email, action, secret) {
    const payload = `${action}:${email}`;
    const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return Buffer.from(`${payload}:${sig}`).toString("base64url");
}
export function verifyToken(token, secret) {
    try {
        const decoded = Buffer.from(token, "base64url").toString("utf8");
        const [action, email, sig] = decoded.split(":");
        const check = crypto.createHmac("sha256", secret).update(`${action}:${email}`).digest("hex");
        if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(check))) return { action, email };
    } catch {}
    return null;
}