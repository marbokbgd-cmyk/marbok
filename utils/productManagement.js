export const IMPORT_HEADERS = [
    "Akcija",
    "Šifra",
    "Naziv",
    "Cena RSD",
    "Pakovanje",
    "Kategorija",
    "Sekcija",
];

export function normalizeLookup(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "dj")
        .trim()
        .toLowerCase();
}

export function normalizeProduct(input = {}) {
    return {
        name: String(input.name || "").trim(),
        productKey: String(input.productKey || "").trim(),
        price: String(input.price ?? "").trim().replace(/\s/g, ""),
        package: String(input.package || "").trim(),
        groupId: String(input.groupId || "").trim(),
    };
}

export function validateProduct(input) {
    const product = normalizeProduct(input);
    const errors = [];
    if (!product.name) errors.push("Naziv je obavezan.");
    if (!product.productKey) errors.push("Šifra je obavezna.");
    if (!product.groupId) errors.push("Izaberi sekciju proizvoda.");
    const numericPrice = Number(product.price.replace(",", "."));
    if (!product.price || !Number.isFinite(numericPrice) || numericPrice < 0)
        errors.push("Cena mora biti broj koji nije negativan.");
    if (product.name.length > 200 || product.productKey.length > 100 || product.package.length > 100)
        errors.push("Neko polje je predugačko.");
    return { product, errors };
}

export function indexGroups(categories = []) {
    const groups = [];
    for (const category of categories) {
        for (const group of category.groups || []) {
            groups.push({ ...group, categoryId: category.id, categoryTitle: category.title });
        }
    }
    return groups;
}

export function planImport(rows, catalog) {
    const productsByKey = new Map((catalog.products || []).map(product => [normalizeLookup(product.productKey), product]));
    const groups = indexGroups(catalog.categories);
    const groupsByPath = new Map(groups.map(group => [
        `${normalizeLookup(group.categoryTitle)}::${normalizeLookup(group.title)}`,
        group,
    ]));
    const seen = new Set();

    return rows.map((raw, index) => {
        const row = Number(raw.sourceRow) || index + 2;
        const action = normalizeLookup(raw.action || "dodaj/izmeni");
        const productKey = String(raw.productKey || "").trim();
        const existing = productsByKey.get(normalizeLookup(productKey));
        const errors = [];
        let operation = "upsert";
        if (["obrisi", "obriši", "delete"].includes(action)) operation = "delete";
        else if (!["dodaj/izmeni", "dodaj", "izmeni", "upsert", "add", "update", ""].includes(action))
            errors.push("Nepoznata akcija.");
        if (!productKey) errors.push("Šifra je obavezna.");
        const key = normalizeLookup(productKey);
        if (key && seen.has(key)) errors.push("Ista šifra se ponavlja u fajlu.");
        seen.add(key);

        if (operation === "delete") {
            if (!existing) errors.push("Proizvod sa ovom šifrom ne postoji.");
            return { row, operation, existingId: existing?.id || null, productKey, errors };
        }

        if (["dodaj", "add"].includes(action) && existing)
            errors.push("Proizvod sa ovom šifrom već postoji.");
        if (["izmeni", "update"].includes(action) && !existing)
            errors.push("Proizvod za izmenu ne postoji.");

        const group = groupsByPath.get(`${normalizeLookup(raw.category)}::${normalizeLookup(raw.group)}`);
        const checked = validateProduct({
            name: raw.name,
            productKey,
            price: raw.price,
            package: raw.package,
            groupId: group?.id,
        });
        errors.push(...checked.errors);
        if (!group) errors.push("Kategorija ili sekcija nije pronađena.");
        return {
            row,
            operation,
            existingId: existing?.id || null,
            product: checked.product,
            categoryTitle: group?.categoryTitle || String(raw.category || ""),
            groupTitle: group?.title || String(raw.group || ""),
            errors: [...new Set(errors)],
        };
    });
}

export function cellText(cell) {
    const value = cell?.value;
    if (value == null) return "";
    if (typeof value === "object") {
        if ("result" in value) return String(value.result ?? "").trim();
        if ("text" in value) return String(value.text ?? "").trim();
        if (Array.isArray(value.richText)) return value.richText.map(part => part.text || "").join("").trim();
    }
    return String(value).trim();
}
