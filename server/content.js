import { groq } from "next-sanity";
import { sanityClient } from "@/server/sanityClient";
import { withoutPrices } from "@/utils/accountAccess";

async function rawPages() {
    return sanityClient().fetch(
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
    return sanityClient().fetch(groq`*[_type == "heroImages"]`);
}

export async function getHeading() {
    return sanityClient().fetch(groq`*[_type == "mainHeading"]`);
}

export async function getBrandImages() {
    return sanityClient().fetch(groq`*[_type == "brandImages"]`);
}

export async function getAboutUs() {
    return sanityClient().fetch(groq`*[_type == "aboutUs"]`);
}

async function rawCategories() {
    return sanityClient().fetch(
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
}

export async function getOwnerStores() {
    return sanityClient().fetch(
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

export async function getPages(withPrices = false) { const data = await rawPages(); return withPrices ? data : withoutPrices(data); }

export async function getCategories(withPrices = false) { const data = await rawCategories(); return withPrices ? data : withoutPrices(data); }

// Store/customer data is never included in unauthenticated server-rendered pages.
export async function getStores() { return []; }
