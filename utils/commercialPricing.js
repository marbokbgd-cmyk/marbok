import {
    COMMERCIAL_PRICE_INCREASE_PERCENT,
    IS_COMMERCIAL_SITE,
} from "@/config/site";

const CONFECTIONERY_SLUGS = new Set(["turski-program"]);

const normalizeText = (value) =>
    String(value || "")
        .trim()
        .toLocaleLowerCase("sr-Latn");

export const isConfectioneryCategory = (category) => {
    const slug = normalizeText(category?.slug?.current || category?.slug);
    const title = normalizeText(category?.title);

    return (
        CONFECTIONERY_SLUGS.has(slug) ||
        title.includes("konditorski")
    );
};

const parsePrice = (price) => {
    if (typeof price === "number") return price;
    if (typeof price !== "string") return Number.NaN;

    let normalized = price
        .replace(/rsd/gi, "")
        .replace(/\s/g, "")
        .replace(/[^\d,.-]/g, "");

    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");

    if (lastComma !== -1 && lastDot !== -1) {
        const decimalSeparator = lastComma > lastDot ? "," : ".";
        const thousandsSeparator = decimalSeparator === "," ? "." : ",";
        normalized = normalized
            .split(thousandsSeparator)
            .join("")
            .replace(decimalSeparator, ".");
    } else if (lastComma !== -1 || lastDot !== -1) {
        const separator = lastComma !== -1 ? "," : ".";
        const parts = normalized.split(separator);
        const looksLikeThousands =
            parts.length > 2 ||
            (parts.length === 2 && parts[1].length === 3);

        normalized = looksLikeThousands
            ? parts.join("")
            : normalized.replace(separator, ".");
    }

    return Number(normalized);
};

export const increasePrice = (
    price,
    percent = COMMERCIAL_PRICE_INCREASE_PERCENT
) => {
    const numericPrice = parsePrice(price);
    if (!Number.isFinite(numericPrice)) return price;

    const increasedPrice =
        Math.round(numericPrice * (1 + percent / 100) * 100) / 100;
    return increasedPrice
        .toFixed(2)
        .replace(/\.00$/, "")
        .replace(/(\.\d)0$/, "$1");
};

const increaseProductPrice = (product) => ({
    ...product,
    price: increasePrice(product?.price),
});

export const applyCommercialPricingToCategory = (category) => {
    if (!IS_COMMERCIAL_SITE || !category || !isConfectioneryCategory(category)) {
        return category;
    }

    return {
        ...category,
        categoryProducts: category.categoryProducts?.map((section) => ({
            ...section,
            contentArea: section.contentArea?.map(increaseProductPrice),
        })),
    };
};

export const applyCommercialPricingToCategories = (categories) => {
    if (!IS_COMMERCIAL_SITE || !Array.isArray(categories)) return categories;
    return categories.map(applyCommercialPricingToCategory);
};

export const mergeCategoryPricesIntoPages = (pages, categories) => {
    if (!IS_COMMERCIAL_SITE || !pages?.content || !Array.isArray(categories)) {
        return pages;
    }

    const priceByProduct = new Map();

    categories.forEach((category) => {
        category?.categoryProducts?.forEach((section) => {
            section?.contentArea?.forEach((product) => {
                if (product?._id) {
                    priceByProduct.set(`id:${product._id}`, product.price);
                }
                if (product?.productKey) {
                    priceByProduct.set(`key:${product.productKey}`, product.price);
                }
            });
        });
    });

    return {
        ...pages,
        content: pages.content.map((section) => ({
            ...section,
            contentArea: section.contentArea?.map((product) => {
                const price =
                    priceByProduct.get(`id:${product?._id}`) ??
                    priceByProduct.get(`key:${product?.productKey}`);

                return price === undefined ? product : { ...product, price };
            }),
        })),
    };
};
