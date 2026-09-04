import { requireOwner } from "@/server/requireOwner";
import { applyImport, prepareImport, ProductError } from "@/server/productManagement";

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Metoda nije dozvoljena." });
    }
    if (!(await requireOwner(req, res))) return;
    try {
        const result = req.body?.apply
            ? await applyImport(req.body.rows)
            : { plan: await prepareImport(req.body?.rows) };
        return res.status(200).json(result);
    } catch (error) {
        const status = error instanceof ProductError ? error.status : 502;
        return res.status(status).json({ error: error instanceof ProductError ? error.message : "Excel uvoz trenutno nije dostupan." });
    }
}

