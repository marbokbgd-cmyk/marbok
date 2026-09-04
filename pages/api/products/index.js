import { requireOwner } from "@/server/requireOwner";
import {
    ProductError,
    cleanProductInput,
    deleteProduct,
    getManagedCatalog,
    saveProduct,
} from "@/server/productManagement";

export const config = { api: { bodyParser: { sizeLimit: "7mb" } } };

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
        res.setHeader("Allow", "GET, POST, PATCH, DELETE");
        return res.status(405).json({ error: "Metoda nije dozvoljena." });
    }
    if (!(await requireOwner(req, res))) return;
    try {
        if (req.method === "GET") return res.status(200).json(await getManagedCatalog());
        if (req.method === "DELETE") {
            await deleteProduct(req.body?.id);
            return res.status(200).json({ deletedId: req.body.id });
        }
        const currentId = req.method === "PATCH" ? req.body?.id : null;
        const id = await saveProduct(cleanProductInput(req.body), currentId);
        return res.status(req.method === "POST" ? 201 : 200).json({ id });
    } catch (error) {
        const status = error instanceof ProductError ? error.status : 502;
        return res.status(status).json({ error: error instanceof ProductError ? error.message : "Promena nije sačuvana. Pokušaj ponovo." });
    }
}

