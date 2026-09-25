import { createClient, groq } from "next-sanity";
import clientConfig from "./config/client-config";
import { auth } from "@/config/firebase";
import { applyCommercialPricingToCategories } from "@/utils/commercialPricing";

export async function getPages() {
    if (typeof window !== "undefined") return browserCatalog("pages");
    return serverClient().fetch(
        groq`*[_type == "page" && _id == 'be35d245-f2fa-4f0b-b0aa-27c099c40c55'][0]{
      content[]->{
        "image": image.asset->url,
        title,
        contentArea[]->{
          price,
          productKey,
          image,
          package,
          name,
          _id,
          blockProductImages,
        }
      }
    }`
    );
}

export async function getImages() {
    if (typeof window !== "undefined") return browserCatalog("images");
    return serverClient().fetch(groq`*[_type == "heroImages"]`);
}

export async function getHeading() {
    if (typeof window !== "undefined") return browserCatalog("heading");
    return serverClient().fetch(groq`*[_type == "mainHeading"]`);
}

export async function getBrandImages() {
    if (typeof window !== "undefined") return browserCatalog("brands");
    return serverClient().fetch(groq`*[_type == "brandImages"]`);
}

export async function getAboutUs() {
    if (typeof window !== "undefined") return browserCatalog("about");
    return serverClient().fetch(groq`*[_type == "aboutUs"]`);
}

export async function getCategories() {
    if (typeof window !== "undefined") return browserCatalog("categories");
    const categories = await serverClient().fetch(
        groq`*[_type == "categoryPage"]{
                title,
                slug,
              categoryProducts[]->{
                "image": image.asset->url,
                title,
                contentArea[]->{
                  price,
                  productKey,
                  image,
                  package,
                  name,
                  _id,
                  blockProductImages,
                }
              }
            }`
    );

    return applyCommercialPricingToCategories(categories);
}

export async function getStores() {
    if (typeof window !== "undefined") return browserCatalog("stores");
    return serverClient().fetch(
        groq`*[_type == "store"]{
            name,
            pib,
            address,
            phone,
            email,
            contactPerson,
            pass,
            _id
        }`
    );
}


function serverClient() {
    if (!process.env.SANITY_API_TOKEN) throw new Error("SANITY_API_TOKEN missing");
    return createClient({ ...clientConfig, token: process.env.SANITY_API_TOKEN, useCdn: false });
}

async function browserCatalog(kind) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Prijava je potrebna.");
    const response = await fetch(`/api/catalog-data?kind=${encodeURIComponent(kind)}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Katalog nije dostupan.");
    return (await response.json()).data;
}

export async function createOrder(data) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Prijava je potrebna.");
    const response = await fetch("/api/orders/create", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Porudžbina nije sačuvana.");
    return (await response.json()).order;
}

export async function createStore(data) {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Prijava je potrebna.");
    const response = await fetch("/api/stores/create", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Prodavnica nije sačuvana.");
    return (await response.json()).store;
}

export async function getOrder(orderNumber) {
    return serverClient().fetch(`*[_type == "order" && orderNumber == $orderNumber][0]{...,items[]{...,"productDetails": *[_type == "productInfo" && productKey == ^.productKey][0]{name,image,price,productKey}}}`, { orderNumber });
}

export async function getOrders() {
    return serverClient().fetch(`*[_type == "order"] | order(createdAt desc){orderNumber,customerName,email,phone,items,createdAt,_id}`);
}
