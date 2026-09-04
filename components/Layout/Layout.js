import AccountStatus from "@/components/AccountStatus/AccountStatus";
import React, { useState } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import Head from "next/head";

function Layout({ children, category, footerClassName, categories, stores }) {
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const pageTitle = category?.title
        ? `${category.title} | Marbok`
        : "Marbok | Veleprodaja konditorskih proizvoda";
    const pageDescription =
        "Marbok B2B katalog konditorskih proizvoda, kućne hemije i kozmetike za poslovne kupce u Srbiji.";

    return (
        <div>
            <Head>
                <title>{pageTitle}</title>
                <meta name="description" content={pageDescription} />
                <meta name="theme-color" content="#bc4d4d" />
                <meta property="og:type" content="website" />
                <meta property="og:site_name" content="Marbok" />
                <meta property="og:title" content={pageTitle} />
                <meta property="og:description" content={pageDescription} />
                <meta property="og:image" content="/logo.png" />
                <link rel="shortcut icon" href="/icon.ico" />
            </Head>
            <Header
                category={category}
                categories={categories}
                setFilteredProducts={setFilteredProducts}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                stores={stores}
            />
            <AccountStatus />
            {children({ category, filteredProducts, searchQuery })}
            <Footer footerClassName={footerClassName} />
        </div>
    );
}

export default Layout;
