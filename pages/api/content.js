import { getPages, getCategories, getImages, getHeading, getBrandImages, getAboutUs, getOwnerStores } from "@/server/content";
import { access, AccessError, sendError } from "@/server/accountAccess";
const publicReaders = { images: getImages, heading: getHeading, brands: getBrandImages, about: getAboutUs };
export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).end(); }
    try {
        const { kind } = req.query;
        if (Object.hasOwn(publicReaders, kind)) return res.status(200).json({ data: await publicReaders[kind]() });
        if (!["pages", "categories", "stores"].includes(kind)) throw new AccessError(400, "Nepoznat zahtev.");
        const session = req.headers.authorization ? await access(req) : null;
        if (kind === "stores") {
            if (!session?.owner) throw new AccessError(403, "Opcija je dostupna samo vlasniku.");
            return res.status(200).json({ data: await getOwnerStores() });
        }
        return res.status(200).json({ data: await (kind === "pages" ? getPages : getCategories)(session?.status === "approved") });
    } catch (error) { return sendError(res, error); }
}
