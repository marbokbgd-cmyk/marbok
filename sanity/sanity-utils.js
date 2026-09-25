import { createClient, groq } from "next-sanity";
import clientConfig from "./config/client-config";
import { applyCommercialPricingToCategories } from "@/utils/commercialPricing";

export async function getPages() {
    return createClient(clientConfig).fetch(
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
    return createClient(clientConfig).fetch(groq`*[_type == "heroImages"]`);
}

export async function getHeading() {
    return createClient(clientConfig).fetch(groq`*[_type == "mainHeading"]`);
}

export async function getBrandImages() {
    return createClient(clientConfig).fetch(groq`*[_type == "brandImages"]`);
}

export async function getAboutUs() {
    return createClient(clientConfig).fetch(groq`*[_type == "aboutUs"]`);
}

export async function getCategories() {
    const categories = await createClient(clientConfig).fetch(
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
    return createClient(clientConfig).fetch(
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

export async function createOrder(orderData) {
    const totalPrice = orderData.items.reduce((sum, item) => {
        const price = parseFloat(item.price.replace(/[^\d.-]/g, ""));
        const quantity = parseInt(item.quantity);
        return sum + price * quantity;
    }, 0);

    return createClient(clientConfig).create({
        _type: "order",
        orderNumber: `ORD-${Date.now()}`,
        customerName: orderData.firstName,
        email: orderData.email,
        phone: orderData.phone,
        message: orderData.message,
        pib: orderData.pib || "",
        pass: orderData.pass || "",
        items: orderData.items.map((item) => ({
            ...item,
            _key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        })),
        totalPrice: `${totalPrice} rsd`,
        createdAt: new Date().toISOString(),
    });
}

export async function getOrder(orderNumber) {
    return createClient(clientConfig).fetch(
        groq`*[_type == "order" && orderNumber == $orderNumber][0]{
            ...,
            items[] {
                ...,
                "productDetails": *[_type == "productInfo" && productKey == ^.productKey][0]{
                    name,
                    image,
                    price,
                    productKey
                }
            }
        }`,
        { orderNumber }
    );
}

export async function getOrders() {
    return createClient(clientConfig).fetch(
        groq`*[_type == "order"] | order(createdAt desc) {
            orderNumber,
            customerName,
            email,
            phone,
            items,
            createdAt,
            _id
        }`
    );
}

export async function createStore(store) {
    return createClient(clientConfig).create({
        _type: "store",
        name: store.name,
        pib: store.pib,
        address: store.address,
        phone: store.phone,
        email: store.email,
        contactPerson: store.contactPerson,
    });
}
