import { createClient } from "next-sanity";
import clientConfig from "@/sanity/config/client-config";
import { IS_COMMERCIAL_SITE } from "@/config/site";

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "GET") return res.status(405).end();

    const tokenConfigured = Boolean(process.env.SANITY_API_TOKEN);
    if (!tokenConfigured) {
        return res.status(200).json({ commercial: IS_COMMERCIAL_SITE, tokenConfigured, catalogReadable: false, reason: "missing_server_token" });
    }

    try {
        await createClient({ ...clientConfig, token: process.env.SANITY_API_TOKEN, useCdn: false })
            .fetch(`count(*[_type == "categoryPage"])`);
        return res.status(200).json({ commercial: IS_COMMERCIAL_SITE, tokenConfigured, catalogReadable: true });
    } catch (error) {
        return res.status(200).json({ commercial: IS_COMMERCIAL_SITE, tokenConfigured, catalogReadable: false,
            reason: Number(error?.statusCode) || "sanity_unavailable" });
    }
}
