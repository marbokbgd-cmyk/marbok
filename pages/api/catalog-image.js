const ALLOWED_IMAGE_HOST = "cdn.sanity.io";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).end("Method not allowed");
    }

    try {
        const imageUrl = new URL(req.query.url);

        if (imageUrl.protocol !== "https:" || imageUrl.hostname !== ALLOWED_IMAGE_HOST) {
            return res.status(400).end("Invalid image URL");
        }

        const response = await fetch(imageUrl.toString());
        if (!response.ok) {
            return res.status(response.status).end("Image is unavailable");
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
            return res.status(415).end("Invalid image type");
        }

        const imageBuffer = Buffer.from(await response.arrayBuffer());
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");
        return res.status(200).send(imageBuffer);
    } catch {
        return res.status(400).end("Invalid image request");
    }
}
