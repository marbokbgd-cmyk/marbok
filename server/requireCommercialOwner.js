import { COMMERCIAL_OWNER_EMAIL } from "@/config/site";
import { firebaseConfig } from "@/config/firebasePublic";

export async function requireCommercialOwner(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
    if (!match) { res.status(401).json({ error: "Prijava je potrebna." }); return null; }
    try {
        const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: match[1] }), signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) { res.status(401).json({ error: "Prijava je istekla." }); return null; }
        const user = (await response.json()).users?.[0];
        if (!user?.localId || user.disabled || user.email?.toLowerCase() !== COMMERCIAL_OWNER_EMAIL) {
            res.status(403).json({ error: "Pristup je dozvoljen samo vlasniku." }); return null;
        }
        return user;
    } catch {
        res.status(503).json({ error: "Provera prijave trenutno nije dostupna." }); return null;
    }
}
