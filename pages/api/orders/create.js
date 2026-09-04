import { randomUUID } from "node:crypto";
import { requireApproved, AccessError, sendError } from "@/server/accountAccess";
import { sanityClient } from "@/server/sanityClient";
import { parseOrderPrice } from "@/utils/orderDocument";
export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
    try {
        const session = await requireApproved(req);
        const data = req.body;
        if (!data || !Array.isArray(data.items) || !data.items.length || data.items.length > 500)
            throw new AccessError(400, "Korpa nije ispravna.");
        for (const field of ["firstName", "email", "phone"])
            if (typeof data[field] !== "string" || !data[field].trim() || data[field].length > 200) throw new AccessError(400, "Popuni podatke za porudžbinu.");
        if (data.items.some(item => !item || !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 100000))
            throw new AccessError(400, "Proveri količine u korpi.");
        const client = sanityClient();
        const ids = data.items.map(item => item.productId).filter(value => typeof value === "string");
        const keys = data.items.map(item => item.productKey).filter(value => typeof value === "string" || typeof value === "number");
        const products = await client.fetch('*[_type == "productInfo" && (_id in $ids || productKey in $keys)]{_id, name, price, productKey}', { ids, keys });
        const items = data.items.map(item => {
            const matches = products.filter(product => item.productId ? product._id === item.productId : String(product.productKey) === String(item.productKey));
            if (matches.length !== 1) throw new AccessError(400, "Neki proizvod više nije dostupan. Osveži korpu.");
            const product = matches[0];
            return { _key: randomUUID(), productId: product._id, productKey: String(product.productKey ?? ""), name: product.name || "",
                quantity: String(Number(item.quantity)), price: String(product.price ?? "") };
        });
        const total = items.reduce((sum, item) => sum + parseOrderPrice(item.price) * Number(item.quantity), 0);
        const order = await client.create({ _type: "order", orderNumber: `ORD-${Date.now()}-${randomUUID().slice(0, 6)}`,
            customerUid: session.account.localId, customerName: data.firstName.trim(), email: data.email.trim(), phone: data.phone.trim(),
            message: String(data.message || "").slice(0, 5000), pib: String(data.pib || "").slice(0, 50), pass: String(data.pass || "").slice(0, 100),
            items, totalPrice: `${Math.round(total * 100) / 100} rsd`, createdAt: new Date().toISOString() });
        return res.status(201).json({ order });
    } catch (error) { return sendError(res, error); }
}
