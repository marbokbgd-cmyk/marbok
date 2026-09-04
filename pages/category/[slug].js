import React from "react";
import { getCategories, getPages, getStores } from "@/server/content";
import styles from "./page.module.css";
import Content from "@/components/Content/Content";
import { useCategories, usePages } from "@/hooks/usePages";
import Layout from "@/components/Layout/Layout";

export default function Category({
    initialCategory,
    initialPages,
    initialStores,
    slug,
    category: initialSelectedCategory,
}) {
    const categories = useCategories() || initialCategory;
    const pages = usePages() || initialPages;
    const category = categories?.find(item => item.slug?.current === slug) || initialSelectedCategory;

    return (
        <Layout
            category={category}
            categories={categories}
            stores={initialStores}
        >
            {({ filteredProducts, searchQuery }) => (
                <div className={styles.container}>
                    <Content
                        pages={pages}
                        categories={category}
                        filteredProducts={filteredProducts}
                        searchQuery={searchQuery}
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
    const category = initialCategory.find(item => item.slug?.current === slug) || null;
    if (!category) return { notFound: true };
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
