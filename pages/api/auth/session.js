import { requireCommercialOwner } from "@/server/requireCommercialOwner";

export default async function handler(req, res) {
    if (req.method === "DELETE") {
        res.setHeader("Set-Cookie", "marbok_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
        return res.status(204).end();
    }
    if (req.method !== "POST") { res.setHeader("Allow", "POST, DELETE"); return res.status(405).end(); }
    if (!(await requireCommercialOwner(req, res))) return;
    const token = req.headers.authorization.slice(7);
    res.setHeader("Set-Cookie", `marbok_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3300`);
    return res.status(204).end();
}
