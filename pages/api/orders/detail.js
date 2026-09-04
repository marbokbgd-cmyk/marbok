import { readAccessibleOrder } from "@/server/readOrder";
import { sendError } from "@/server/accountAccess";
export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }
    try { return res.status(200).json({ order: await readAccessibleOrder(req, req.query.orderNumber) }); }
    catch (error) { return sendError(res, error); }
}
