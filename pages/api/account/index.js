import { access, sendError } from "@/server/accountAccess";
export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }
    try {
        const session = await access(req);
        return res.status(200).json({ status: session.status, owner: session.owner, profile: session.profile || null });
    } catch (error) { return sendError(res, error); }
}
