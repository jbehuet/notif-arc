import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { getStore } from "@netlify/blobs";

const DATA_DIR = resolve(process.cwd(), ".data");

const BUCKET = "crnata-tir18m";

async function ensureDir(p) {
    await fs.mkdir(p, { recursive: true }).catch(() => {});
}

export async function getJson(key, use_local_store = false) {
    if (use_local_store) {
        await ensureDir(DATA_DIR);
        const file = resolve(DATA_DIR, key);
        try {
            const txt = await fs.readFile(file, "utf8");
            return JSON.parse(txt);
        } catch {
            return null;
        }
    } else {
        const store = getStore(
            {
                name: 'BUCKET',
                siteID: process.env.NETLIFY_SITE_ID,
                token: process.env.NETLIFY_AUTH_TOKEN
            });
        return (await store.get(key, { type: "json" }));
    }
}

export async function setJson(key, data, use_local_store = false) {
    if (use_local_store) {
        await ensureDir(DATA_DIR);
        const file = resolve(DATA_DIR, key);
        await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
    } else {
        const store = getStore(
            {
                name: 'BUCKET',
                siteID: process.env.NETLIFY_SITE_ID,
                token: process.env.NETLIFY_AUTH_TOKEN
            });
        await store.set(key, JSON.stringify(data, null, 2));
    }
}