import { sanityClient } from "@/server/sanityClient";
import { requireOwner } from "@/server/requireOwner";

export default async function handler(req, res) {
    if (!["GET", "DELETE"].includes(req.method)) {
        res.setHeader("Allow", "GET, DELETE");
        return res.status(405).json({ error: "Metoda nije dozvoljena." });
    }
    if (!(await requireOwner(req, res))) return;
    const { id } = req.query;
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) {
        return res.status(400).json({ error: "Neispravna porudžbina." });
    }
    try {
        if (req.method === "GET") {
            const order = await sanityClient().fetch(
                '*[_type == "order" && _id == $id][0]{..., items[]{..., "productDetails": *[_type == "productInfo" && ((_id == ^.productId) || (!defined(^.productId) && productKey == ^.productKey))][0]{name, image, productKey, package}}}',
                { id }
            );
            if (!order) return res.status(404).json({ error: "Porudžbina nije pronađena." });
            return res.status(200).json({ order });
        }
        // A constrained query can only delete this order, never a store or product.
        await sanityClient().delete({
            query: '*[_type == "order" && _id == $id]', params: { id },
        });
        return res.status(200).json({ deletedId: id });
    } catch {
        return res.status(502).json({ error: req.method === "GET" ? "Porudžbina nije učitana. Pokušaj ponovo." : "Porudžbina nije obrisana. Pokušaj ponovo." });
    }
}
