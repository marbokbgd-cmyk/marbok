import React, { useState, useEffect } from "react";
import styles from "./Content.module.css";
import Modal from "@/components/Modal/Modal";
import { useForm } from "react-hook-form";
import { useCart } from "@/hooks/useCart";
import ContentArea from "@/components/ContentArea/ContentArea";

export const revalidate = 10;

function Content({ filteredProducts, categories }) {
    const [modalStates, setModalStates] = useState({});
    const [updatedFilteredProducts, setUpdatedFilteredProducts] = useState([]);
    const { addToCart } = useCart();
    const methods = useForm();

    const toggleModal = (pageId) => {
        setModalStates((prevState) => ({
            ...prevState,
            [pageId]: !prevState[pageId],
        }));
    };

    useEffect(() => {
        setUpdatedFilteredProducts(filteredProducts?.filteredProducts || []);
    }, [filteredProducts?.filteredProducts]);

    if (!categories || !categories.categoryProducts.length) {
        return <div>Nema proizvoda!</div>;
    }

    const sortedCategories = [...categories.categoryProducts].sort((a, b) => {
        if (a.title === "Novi proizvodi" && b.title !== "Novi proizvodi")
            return -1;
        if (b.title === "Novi proizvodi" && a.title !== "Novi proizvodi")
            return 1;
        return 0;
    });

    return (
        <div>
            <div className={styles.categoryIntro}>
                <div className={styles.lineHeader}></div>
                <h2
                    className={styles.categorySectionHeader}
                    id={categories?.title}
                >
                    {categories?.title}
                </h2>
            </div>

            {!filteredProducts.filteredProducts.length &&
                sortedCategories.map((page) => (
                    <div key={page?._id} className={styles.productBlock}>
                        {page?.image && (
                            <img
                                src={page?.image}
                                alt={page?.title}
                                className={styles.heroImage}
                            />
                        )}
                        <h2
                            className={styles.productSectionHeader}
                            id={page?.title}
                        >
                            {page?.title}
                        </h2>
                        <div className={styles.contentContainer}>
                            {page?.contentArea?.map((contentArea) => (
                                <>
                                    <ContentArea
                                        key={contentArea?._id}
                                        contentArea={contentArea}
                                        addToCart={addToCart}
                                        methods={methods}
                                        toggleModal={toggleModal}
                                    />
                                    <Modal
                                        key={contentArea?._id}
                                        isOpen={modalStates[contentArea?._id]}
                                        onClose={() =>
                                            toggleModal(contentArea?._id)
                                        }
                                        images={[
                                            contentArea?.image,
                                            ...(contentArea?.blockProductImages
                                                ?.productImages || []),
                                        ]}
                                    />
                                </>
                            ))}
                        </div>
                    </div>
                ))}
            {updatedFilteredProducts.length && (
                <div className={styles.contentContainer}>
                    {updatedFilteredProducts.map((filteredcontentArea) => (
                        <>
                            <ContentArea
                                key={filteredcontentArea?._id}
                                contentArea={filteredcontentArea}
                                addToCart={addToCart}
                                methods={methods}
                                toggleModal={toggleModal}
                            />
                        </>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Content;

export function getStaticProps() {
    return { props: {}, revalidate: 10 };
}
