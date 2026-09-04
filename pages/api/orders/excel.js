import { readAccessibleOrder } from "@/server/readOrder";
import { AccessError, sendError } from "@/server/accountAccess";
import { sanityClient } from "@/server/sanityClient";
export const config = { api: { bodyParser: false } };
export default async function handler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
    try {
        const order = await readAccessibleOrder(req, req.query.orderNumber);
        const chunks = []; let length = 0;
        for await (const chunk of req) {
            length += chunk.length;
            if (length > 4 * 1024 * 1024) throw new AccessError(413, "Excel je prevelik za slanje. Porudžbina je sačuvana.");
            chunks.push(chunk);
        }
        const file = Buffer.concat(chunks);
        if (file.length < 4 || file.readUInt32LE(0) !== 0x04034b50) throw new AccessError(400, "Neispravan Excel dokument.");
        const asset = await sanityClient().assets.upload("file", file, {
            filename: `MARBOK_Porudzbina_${order.orderNumber}.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        return res.status(200).json({ url: asset.url });
    } catch (error) { return sendError(res, error); }
}
