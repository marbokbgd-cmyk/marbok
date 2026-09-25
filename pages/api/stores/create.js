import { createClient } from "next-sanity";
import clientConfig from "@/sanity/config/client-config";
import { requireCommercialOwner } from "@/server/requireCommercialOwner";

export default async function handler(req, res) {
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
    if (!(await requireCommercialOwner(req, res))) return;
    try {
        if (!process.env.SANITY_API_TOKEN) throw new Error("Missing Sanity token");
        const data = req.body || {};
        const store = await createClient({ ...clientConfig, token: process.env.SANITY_API_TOKEN }).create({
            _type: "store", name: String(data.name || "").slice(0,160), pib: String(data.pib || "").slice(0,20),
            address: String(data.address || "").slice(0,250), phone: String(data.phone || "").slice(0,50),
            email: String(data.email || "").slice(0,180), contactPerson: String(data.contactPerson || "").slice(0,120),
        });
        return res.status(201).json({ store });
    } catch { return res.status(502).json({ error: "Prodavnica nije sačuvana." }); }
}
