import { identity, readProfile, decideProfile, AccessError, sendError } from "@/server/accountAccess";
import { isOwner } from "@/utils/adminAccess";
import { sanityClient } from "@/server/sanityClient";
export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "PATCH") { res.setHeader("Allow", "PATCH"); return res.status(405).end(); }
    try {
        const session = await identity(req);
        if (!isOwner(session.account)) throw new AccessError(403, "Samo vlasnik može da odobrava korisnike.");
        const { uid } = req.query;
        const { status } = req.body || {};
        if (typeof uid !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) || !["approved", "rejected"].includes(status))
            throw new AccessError(400, "Neispravna odluka.");
        if (uid === session.account.localId) throw new AccessError(400, "Vlasnički nalog se ne menja ovde.");
        const profile = await readProfile(uid, session.token);
        if (!profile) throw new AccessError(404, "Podaci korisnika nisu pronađeni.");
        if (status === "approved") {
            if (![profile.name, profile.companyName, profile.address, profile.phone, profile.email].every(value => typeof value === "string" && value.trim()) || !/^\d{9}$/.test(profile.pib || ""))
                throw new AccessError(400, "Za odobrenje su potrebni ime, firma, PIB, adresa, telefon i mejl.");
            // Retrying approval cannot create duplicate stores.
            await sanityClient().createIfNotExists({ _id: `customer-${uid}`, _type: "store", name: profile.companyName,
                pib: profile.pib, address: profile.address, phone: profile.phone, email: profile.email, contactPerson: profile.name });
        }
        await decideProfile(uid, status, session);
        return res.status(200).json({ status });
    } catch (error) { return sendError(res, error); }
}
