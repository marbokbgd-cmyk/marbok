import { firebaseConfig } from "@/config/firebasePublic";
import { isOwner } from "@/utils/adminAccess";
import { accountStatus } from "@/utils/accountAccess";

export class AccessError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
export function sendError(res, error) {
    return res.status(error instanceof AccessError ? error.status : 503).json({
        error: error instanceof AccessError ? error.message : "Usluga trenutno nije dostupna. Pokušaj ponovo.",
    });
}
export async function identity(req) {
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization || "")?.[1];
    if (!token) throw new AccessError(401, "Prijavi se da nastaviš.");
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new AccessError(response.status >= 500 || response.status === 429 ? 503 : 401, "Prijava nije potvrđena. Pokušaj ponovo.");
    const account = (await response.json()).users?.[0];
    if (!account?.localId || account.disabled) throw new AccessError(403, "Nalog nije dostupan.");
    return { account, token };
}
const usersUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users`;
export async function readProfile(uid, token) {
    const response = await fetch(`${usersUrl}/${encodeURIComponent(uid)}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new AccessError(503, "Podaci naloga trenutno nisu dostupni. Pokušaj ponovo.");
    const { fields = {} } = await response.json();
    return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.stringValue ?? null]));
}
export async function access(req) {
    const session = await identity(req);
    if (isOwner(session.account)) return { ...session, status: "approved", owner: true };
    const profile = await readProfile(session.account.localId, session.token);
    return { ...session, profile, status: accountStatus(session.account, profile), owner: false };
}
export async function requireApproved(req) {
    const session = await access(req);
    if (session.status !== "approved") throw new AccessError(403, session.status === "rejected"
        ? "Zahtev za pristup nije odobren." : "Nalog čeka odobrenje. Cene i poručivanje će biti dostupni nakon odobrenja.");
    return session;
}
export async function decideProfile(uid, status, session) {
    const fields = {
        approvalStatus: { stringValue: status },
        reviewedAt: { stringValue: new Date().toISOString() },
        reviewedBy: { stringValue: session.account.localId },
    };
    const mask = Object.keys(fields).map(key => `updateMask.fieldPaths=${key}`).join("&");
    const response = await fetch(`${usersUrl}/${encodeURIComponent(uid)}?${mask}&currentDocument.exists=true`, {
        method: "PATCH", headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields }), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new AccessError(503, "Odluka nije sačuvana. Proveri Firebase pravila i pokušaj ponovo.");
}
