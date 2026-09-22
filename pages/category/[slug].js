import React from "react";
import { getCategories, getPages, getStores } from "@/sanity/sanity-utils";
import styles from "./page.module.css";
import Content from "@/components/Content/Content";
import { useCategories, usePages } from "@/hooks/usePages";
import Layout from "@/components/Layout/Layout";
import { createClient } from "next-sanity";
import clientConfig from "../../sanity/config/client-config";
import { applyCommercialPricingToCategory } from "@/utils/commercialPricing";

export default function Category({
    initialCategory,
    initialPages,
    initialStores,
    slug,
    category,
}) {
    const categories = useCategories() || initialCategory;
    const pages = usePages() || initialPages;

    return (
        <Layout
            category={category}
            categories={categories}
            stores={initialStores}
        >
            {(filteredProducts) => (
                <div className={styles.container}>
                    <Content
                        pages={pages}
                        categories={category}
                        filteredProducts={filteredProducts}
                    />
                </div>
            )}
        </Layout>
    );
}

export async function getServerSideProps({ params }) {
    const slug = params.slug;
    const initialCategory = await getCategories();
    const initialPages = await getPages();
    const categoryData = await createClient(clientConfig).fetch(
        `*[_type == "categoryPage" && slug.current == "${slug}"][0]{
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
    const category = applyCommercialPricingToCategory(categoryData);
    const initialStores = await getStores();

    return {
        props: {
            initialCategory,
            initialPages,
            category,
            slug: params.slug,
            initialStores,
        },
    };
}
