import { randomUUID } from "node:crypto";
import { sanityClient } from "@/server/sanityClient";
import { normalizeProduct, planImport, validateProduct } from "@/utils/productManagement";

export class ProductError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export async function getManagedCatalog() {
    const client = sanityClient();
    const [categories, products] = await Promise.all([
        client.fetch(`*[_type == "categoryPage"] | order(title asc) {
            "id": _id, title,
            "groups": categoryProducts[]->{"id": _id, title, "productIds": contentArea[]._ref}
        }`),
        client.fetch(`*[_type == "productInfo"] | order(name asc) {
            "id": _id, name, productKey, price, package,
            "imageUrl": image.asset->url
        }`),
    ]);
    const productGroup = new Map();
    for (const category of categories || []) for (const group of category.groups || [])
        for (const productId of group.productIds || []) if (!productGroup.has(productId)) productGroup.set(productId, group.id);
    return {
        categories: (categories || []).map(category => ({
            ...category,
            groups: (category.groups || []).map(({ productIds, ...group }) => group),
        })),
        products: (products || []).map(product => ({ ...product, groupId: productGroup.get(product.id) || null })),
    };
}

async function getManagedGroupIds(client) {
    const categories = await client.fetch('*[_type == "categoryPage"]{"ids": categoryProducts[]._ref}');
    return [...new Set((categories || []).flatMap(category => category.ids || []))];
}

async function assertUniqueKey(client, productKey, currentId) {
    const duplicate = await client.fetch(
        '*[_type == "productInfo" && lower(productKey) == lower($productKey) && _id != $currentId][0]._id',
        { productKey, currentId: currentId || "" }
    );
    if (duplicate) throw new ProductError(409, "Već postoji proizvod sa ovom šifrom.");
}

async function assertGroup(client, groupId) {
    const exists = await client.fetch('count(*[_type == "productBlock" && _id == $groupId])', { groupId });
    if (exists !== 1) throw new ProductError(400, "Izabrana sekcija ne postoji.");
}

async function imageField(client, image) {
    if (!image) return undefined;
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(image.dataUrl || "");
    if (!match) throw new ProductError(400, "Slika mora biti JPG, PNG ili WebP.");
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > 5 * 1024 * 1024)
        throw new ProductError(413, "Slika može imati najviše 5 MB.");
    const asset = await client.assets.upload("image", bytes, {
        filename: String(image.name || "proizvod").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120),
        contentType: match[1],
    });
    return { _type: "image", asset: { _type: "reference", _ref: asset._id } };
}

export async function saveProduct(input, currentId = null) {
    const client = sanityClient();
    if (currentId && (typeof currentId !== "string" || !/^[a-zA-Z0-9_.-]{1,128}$/.test(currentId)))
        throw new ProductError(400, "Neispravan proizvod.");
    const { product, errors } = validateProduct(input);
    if (errors.length) throw new ProductError(400, errors.join(" "));
    await Promise.all([
        assertUniqueKey(client, product.productKey, currentId),
        assertGroup(client, product.groupId),
    ]);
    const image = await imageField(client, input.image);
    const fields = {
        name: product.name,
        productKey: product.productKey,
        price: product.price.replace(".", ","),
        package: product.package,
        ...(image ? { image } : {}),
    };
    const productId = currentId || `managed-product-${randomUUID()}`;
    const managedGroupIds = currentId ? await getManagedGroupIds(client) : [];
    const sourceIds = currentId
        ? await client.fetch('*[_type == "productBlock" && references($productId) && _id in $managedGroupIds]._id', { productId, managedGroupIds })
        : [];
    let transaction = client.transaction();
    if (currentId) {
        const exists = await client.fetch('count(*[_type == "productInfo" && _id == $id])', { id: currentId });
        if (exists !== 1) throw new ProductError(404, "Proizvod nije pronađen.");
        transaction = transaction.patch(currentId, patch => patch.set(fields));
    } else {
        transaction = transaction.create({ _id: productId, _type: "productInfo", ...fields });
    }
    for (const sourceId of sourceIds || [])
        transaction = transaction.patch(sourceId, patch => patch.unset([`contentArea[_ref == "${productId}"]`]));
    transaction = transaction.patch(product.groupId, patch => patch
        .setIfMissing({ contentArea: [] })
        .append("contentArea", [{ _type: "reference", _ref: productId, _key: randomUUID().replace(/-/g, "") }])
    );
    await transaction.commit();
    return productId;
}

export async function deleteProduct(productId) {
    if (typeof productId !== "string" || !/^[a-zA-Z0-9_.-]{1,128}$/.test(productId))
        throw new ProductError(400, "Neispravan proizvod.");
    const client = sanityClient();
    const exists = await client.fetch('count(*[_type == "productInfo" && _id == $productId])', { productId });
    if (exists !== 1) throw new ProductError(404, "Proizvod nije pronađen.");
    const sourceIds = await client.fetch('*[_type == "productBlock" && references($productId)]._id', { productId });
    let transaction = client.transaction();
    for (const sourceId of sourceIds || [])
        transaction = transaction.patch(sourceId, patch => patch.unset([`contentArea[_ref == "${productId}"]`]));
    transaction = transaction.delete(productId);
    await transaction.commit();
}

export function cleanProductInput(body = {}) {
    const product = normalizeProduct(body);
    return { ...product, image: body.image || null };
}

export async function prepareImport(rows) {
    if (!Array.isArray(rows) || !rows.length || rows.length > 200)
        throw new ProductError(400, "Uvoz mora imati između 1 i 200 redova.");
    const catalog = await getManagedCatalog();
    return planImport(rows, catalog);
}

export async function applyImport(rows) {
    const client = sanityClient();
    const plan = await prepareImport(rows);
    if (plan.some(item => item.errors.length))
        throw new ProductError(400, "Uvoz ima greške. Ispravi fajl i ponovo otvori pregled.");
    let transaction = client.transaction();
    const managedGroupIds = await getManagedGroupIds(client);
    const touchedIds = [];
    for (const item of plan) {
        if (item.operation === "delete") {
            const sourceIds = await client.fetch('*[_type == "productBlock" && references($id)]._id', { id: item.existingId });
            for (const sourceId of sourceIds || [])
                transaction = transaction.patch(sourceId, patch => patch.unset([`contentArea[_ref == "${item.existingId}"]`]));
            transaction = transaction.delete(item.existingId);
            touchedIds.push(item.existingId);
            continue;
        }
        const fields = {
            name: item.product.name,
            productKey: item.product.productKey,
            price: item.product.price.replace(".", ","),
            package: item.product.package,
        };
        const productId = item.existingId || `imported-product-${randomUUID()}`;
        if (item.existingId) {
            const sourceIds = await client.fetch('*[_type == "productBlock" && references($id) && _id in $managedGroupIds]._id', { id: productId, managedGroupIds });
            for (const sourceId of sourceIds || [])
                transaction = transaction.patch(sourceId, patch => patch.unset([`contentArea[_ref == "${productId}"]`]));
            transaction = transaction.patch(productId, patch => patch.set(fields));
        } else {
            transaction = transaction.create({ _id: productId, _type: "productInfo", ...fields });
        }
        transaction = transaction.patch(item.product.groupId, patch => patch
            .setIfMissing({ contentArea: [] })
            .append("contentArea", [{ _type: "reference", _ref: productId, _key: randomUUID().replace(/-/g, "") }])
        );
        touchedIds.push(productId);
    }
    await transaction.commit();
    return { count: plan.length, touchedIds };
}
