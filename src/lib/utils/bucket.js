import {getStore} from "@netlify/blobs";
import { NETLIFY_SITE_ID, NETLIFY_AUTH_TOKEN } from '$env/static/private';

const BUCKET_NAME = "notif-arc";

export const Bucket = () => getStore(
    {
        name: BUCKET_NAME,
        siteID: NETLIFY_SITE_ID,
        token: NETLIFY_AUTH_TOKEN
    });