import React, { useState, useCallback } from "react";
import styles from "@/components/Content/Content.module.css";
import { urlFromThumbnail } from "@/utils/image";
import { FormProvider } from "react-hook-form";
import Button from "@/components/Button/Button";
import { FaCartShopping } from "react-icons/fa6";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";
import { useGetCurrentUser } from "@/hooks/useGetCurrentUser";
import { useOfferSelection } from "@/context/OfferSelectionContext";

function ContentArea({ contentArea, addToCart, methods, toggleModal, className, imageClassName }) {
    const [internalQuantity, setInternalQuantity] = useState("1");
    const { user } = useAuth();
    const { data: userData } = useGetCurrentUser({ uid: user?.uid ?? null });
    const isAdmin = (userData?.roles || []).includes("admin");
    const { toggleProduct, isSelected } = useOfferSelection();
    const selected = isSelected(contentArea);

    const handleAddToCart = async (contentAreaName, quantity, productKey, image, price) => {
        if (parseInt(quantity) <= 0) {
            toast.success("Kolicina mora biti veća od 0!");
            return;
        }
        const product = { name: contentAreaName, quantity, productKey, image, price };
        try { await addToCart.mutateAsync(product); }
        catch (error) { console.error("Error adding product to cart:", error); }
    };

    const onChange = useCallback((e) => {
        const value = e.currentTarget?.value;
        if (value !== internalQuantity) setInternalQuantity(value);
    }, [internalQuantity]);
    const decrement = useCallback(() => setInternalQuantity(Math.max(parseInt(internalQuantity) - 1, 0).toString()), [internalQuantity]);
    const increment = useCallback(() => setInternalQuantity((parseInt(internalQuantity) + 1).toString()), [internalQuantity]);

    return (
        <div key={contentArea?._id} className={clsx(styles.productCard, className)} style={selected ? { outline: "3px solid #BC4D4D", outlineOffset: "-3px", position: "relative" } : { position: "relative" }}>
            {isAdmin && (
                <button type="button" onClick={() => toggleProduct(contentArea)} title={selected ? "Ukloni iz ponude" : "Dodaj u ponudu"}
                    style={{ position: "absolute", top: 10, right: 10, zIndex: 5, border: 0, borderRadius: 18, padding: "8px 12px", cursor: "pointer", fontWeight: 700, background: selected ? "#BC4D4D" : "#fff", color: selected ? "#fff" : "#BC4D4D", boxShadow: "0 2px 10px rgba(0,0,0,.18)" }}>
                    {selected ? "✓ U ponudi" : "+ Ponuda"}
                </button>
            )}
            <img src={urlFromThumbnail(contentArea?.image)} alt={contentArea?.name} className={clsx(styles.img, imageClassName)} onClick={() => toggleModal(contentArea?._id)} />
            {contentArea?.package && <p className={styles.package}>{contentArea?.package}</p>}
            <div className={styles.productInfo}>
                {contentArea?.name && <h3 className={styles.productName}>{contentArea?.name}</h3>}
                <div className={styles.fieldInfoContainer}>
                    {contentArea?.price && user && <div className={styles.fieldInfoWrapper}><span className={styles.fieldName}>Cena: </span><span>{contentArea?.price} rsd</span></div>}
                    {contentArea?.productKey && <div className={styles.fieldInfoWrapper}><span className={styles.fieldName}>Šifra proizvoda: </span><span>{contentArea?.productKey}</span></div>}
                </div>
                <FormProvider {...methods}>
                    <div className={styles.quantityContainer}>
                        <div className={styles.quantityWrapper}>
                            <Button size="regular" theme="primary" content="-" handleClick={decrement} className={styles.quantityBtn} />
                            <input type="number" value={internalQuantity} onChange={onChange} className={styles.input} />
                            <Button size="regular" theme="primary" content="+" handleClick={increment} className={styles.quantityBtn} />
                        </div>
                        <FaCartShopping className={styles.cartIcon} onClick={() => handleAddToCart(contentArea?.name, internalQuantity || 0, contentArea?.productKey, contentArea?.image, contentArea?.price)} />
                        <ToastContainer />
                    </div>
                </FormProvider>
            </div>
        </div>
    );
}
export default ContentArea;
