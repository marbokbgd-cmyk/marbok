import crypto from "crypto";
import { requirePortalUser } from "@/server/requirePortalUser";
import { createClient } from "next-sanity";
import clientConfig from "@/sanity/config/client-config";
import { getCategories } from "@/sanity/sanity-utils";

function priceNumber(value) {
    const normalized = String(value).replace(/\s|rsd/gi, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
    return Number(normalized);
}

export default async function handler(req, res) {
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
    const owner = await requirePortalUser(req, res);
    if (!owner) return;
    const data = req.body || {};
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length || items.length > 100 || items.some(item => typeof item.productKey !== "string" || !item.productKey || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 10000)) {
        return res.status(400).json({ error: "Neispravni proizvodi." });
    }
    try {
        if (!process.env.SANITY_API_TOKEN) throw new Error("Missing Sanity token");
        const client = createClient({ ...clientConfig, token: process.env.SANITY_API_TOKEN, useCdn: false });
        const keys = [...new Set(items.map(item => item.productKey))];
        if (keys.length !== items.length) return res.status(400).json({ error: "Proizvod je ponovljen." });
        const products = await client.fetch(`*[_type == "productInfo" && productKey in $keys]{productKey,name,price}`, { keys });
        const categories = await getCategories();
        const commercialPrices = new Map(categories.flatMap(category =>
            (category.categoryProducts || []).flatMap(section =>
                (section.contentArea || []).map(product => [product.productKey, product.price])
            )
        ));
        const map = new Map(products.map(product => [product.productKey, product]));
        if (map.size !== items.length) return res.status(400).json({ error: "Proizvod nije pronađen." });
        const safeItems = items.map(item => {
            const product = map.get(item.productKey);
            const price = commercialPrices.get(item.productKey) ?? product.price;
            if (!Number.isFinite(priceNumber(price))) throw new Error("Invalid price");
            return { _key: crypto.randomBytes(12).toString("hex"), name: product.name, productKey: item.productKey, price, quantity: Number(item.quantity) };
        });
        const orderNumber = `ORD-${Date.now()}${crypto.randomInt(100000,999999)}`;
        const order = await client.create({ _type: "order", orderNumber, firebaseUid: owner.localId,
            customerName: String(data.firstName || "").slice(0,120), email: String(data.email || "").slice(0,180),
            phone: String(data.phone || "").slice(0,50), message: String(data.message || "").slice(0,2000),
            pib: String(data.pib || "").slice(0,20), pass: String(data.pass || "").slice(0,50),
            items: safeItems, totalPrice: `${safeItems.reduce((sum,item) => sum + priceNumber(item.price) * item.quantity,0)} rsd`, createdAt: new Date().toISOString() });
        return res.status(201).json({ order });
    } catch (error) { console.error("Commercial order failed", error); return res.status(502).json({ error: "Porudžbina nije sačuvana." }); }
}
