import { sanityClient } from "@/server/sanityClient";
import { requireOwner } from "@/server/requireOwner";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ error: "Metoda nije dozvoljena." });
    }
    if (!(await requireOwner(req, res))) return;
    try {
        const orders = await sanityClient().fetch(
            `*[_type == "order"] | order(createdAt desc) {
                _id, orderNumber, customerName, email, phone, pib, pass,
                totalPrice, createdAt, "itemCount": count(items)
            }`
        );
        return res.status(200).json({ orders });
    } catch {
        return res.status(502).json({ error: "Porudžbine trenutno nije moguće učitati. Pokušaj ponovo." });
    }
}
