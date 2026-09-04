import React, { useState, useCallback, useRef, useEffect } from "react";
import styles from "@/components/Content/Content.module.css";
import { urlFromOriginalImage } from "@/utils/image";
import { FormProvider } from "react-hook-form";
import Button from "@/components/Button/Button";
import { FaCartShopping } from "react-icons/fa6";
import { toast } from "react-toastify";
import { MdCheck } from "react-icons/md";
import { useProductSelection } from "@/context/ProductSelectionContext";
import { createProductHold, productIdentity } from "@/utils/productSelection";
import clsx from "clsx";
import { useAuth } from "@/hooks/useAuth";

function ContentArea({
    contentArea,
    addToCart,
    methods,
    toggleModal,
    className,
    imageClassName,
    categoryTitle,
    groupTitle,
}) {
    const selection = useProductSelection();
    const entry = { product: contentArea, categoryTitle, groupTitle };
    const selected = selection.items.some(item => productIdentity(item.product) === productIdentity(contentArea));
    const latest = useRef(null);
    latest.current = () => { if (selection.allowed) selection.begin(entry); };
    const hold = useRef(null);
    if (!hold.current) hold.current = createProductHold(() => latest.current());
    useEffect(() => { if (!selection.allowed) hold.current.dispose(); }, [selection.allowed]);
    useEffect(() => () => hold.current.dispose(), []);
    const handleImageClick = () => {
        if (hold.current.consumeClick()) return;
        if (selection.active) selection.toggle(entry);
        else toggleModal(contentArea?._id);
    };
    const [internalQuantity, setInternalQuantity] = useState("1");
    const { user } = useAuth();

    const handleAddToCart = async (
        contentAreaName,
        quantity,
        productId,
        productKey,
        image,
        price
    ) => {
        if (!user) { toast.info("Pristup je dostupan nakon odobrenja naloga."); return; }
        const parsedQuantity = parseInt(quantity, 10);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
            toast.error("Količina mora biti najmanje 1.");
            return;
        }
        const product = {
            name: contentAreaName,
            quantity: String(parsedQuantity),
            productId: productId,
            productKey: productKey,
            image: image,
            price: price,
        };

        try {
            await addToCart.mutateAsync(product);
            setInternalQuantity("1");
            toast.success("Proizvod je dodat u korpu.");
        } catch (error) {
            console.error("Error adding product to cart:", error);
        }
    };

    const onChange = useCallback(
        (e) => {
            const value = e.currentTarget?.value;
            if (value === internalQuantity) {
                return;
            }

            if (!value) {
                setInternalQuantity(value);
                return;
            }

            setInternalQuantity(value);
        },
        [internalQuantity, setInternalQuantity]
    );

    const decrement = useCallback(() => {
        const value = Math.max((parseInt(internalQuantity, 10) || 1) - 1, 1);
        setInternalQuantity(value.toString());
    }, [internalQuantity, setInternalQuantity]);

    const increment = useCallback(() => {
        const value = (parseInt(internalQuantity, 10) || 0) + 1;
        setInternalQuantity(value.toString());
    }, [internalQuantity, setInternalQuantity]);

    return (
        <div
            key={contentArea?._id}
            className={clsx(styles.productCard, className, { [styles.offerSelected]: selected })}
        >
            <div className={clsx(styles.productImageWrapper, { [styles.offerSelectable]: selection.allowed })}>
                {selection.active && <button type="button" className={styles.selectionCircle}
                    aria-label={`${selected ? "Ukloni" : "Izaberi"} ${contentArea?.name} za ponudu`}
                    aria-pressed={selected} onClick={() => selection.toggle(entry)}>
                    {selected && <MdCheck aria-hidden="true" />}
                </button>}
                <img
                    src={urlFromOriginalImage(contentArea?.image)}
                    alt={contentArea?.name}
                    className={clsx(styles.img, imageClassName)}
                    role="button" tabIndex={0}
                    aria-label={selection.active ? `${selected ? "Ukloni" : "Izaberi"} ${contentArea?.name} za ponudu` : `Uvećaj sliku: ${contentArea?.name}`}
                    onPointerDown={selection.allowed ? event => hold.current.down(event) : undefined}
                    onPointerMove={selection.allowed ? event => hold.current.move(event) : undefined}
                    onPointerUp={() => hold.current.end()}
                    onPointerCancel={() => hold.current.end()}
                    onPointerLeave={() => hold.current.end()}
                    onContextMenu={selection.allowed ? event => event.preventDefault() : undefined}
                    onDragStart={selection.allowed ? event => event.preventDefault() : undefined}
                    onKeyDown={event => {
                        if (event.key === " " || event.key === "Enter") {
                            event.preventDefault();
                            if (event.key === " " && selection.allowed && !selection.active) selection.begin(entry);
                            else handleImageClick();
                        }
                    }}
                    onClick={handleImageClick}
                />
                {contentArea?.package && (
                    <p className={styles.package}>{contentArea?.package}</p>
                )}
                <span className={styles.imageHint}>{selection.active ? "Dodirni za izbor" : "Klikni za veću sliku"}</span>
            </div>
            <div className={styles.productInfo}>
                {contentArea?.name && (
                    <h3 className={styles.productName}>{contentArea?.name}</h3>
                )}
                <div className={styles.fieldInfoContainer}>
                    {contentArea?.price && user && (
                        <div className={styles.priceWrapper}>
                            <span className={styles.priceLabel}>Cena</span>
                            <strong>{contentArea?.price} RSD</strong>
                        </div>
                    )}
                    {contentArea?.productKey && (
                        <div className={styles.fieldInfoWrapper}>
                            <span className={styles.fieldName}>
                                Šifra proizvoda:{" "}
                            </span>
                            <span>{contentArea?.productKey}</span>
                        </div>
                    )}
                </div>
                <FormProvider {...methods}>
                    <div className={styles.quantityContainer}>
                        <div className={styles.quantityWrapper}>
                            <Button
                                size={"regular"}
                                theme={"primary"}
                                content="-"
                                handleClick={decrement}
                                className={styles.quantityBtn}
                            />
                            <input
                                type="number"
                                min="1"
                                inputMode="numeric"
                                aria-label={`Količina za ${contentArea?.name}`}
                                value={internalQuantity}
                                onChange={onChange}
                                className={styles.input}
                            />

                            <Button
                                size={"regular"}
                                theme={"primary"}
                                content="+"
                                handleClick={increment}
                                className={styles.quantityBtn}
                            />
                        </div>

                        <button
                            type="button"
                            className={styles.addToCartButton}
                            aria-label={`Dodaj ${contentArea?.name} u korpu`}
                            onClick={() =>
                                handleAddToCart(
                                    contentArea?.name,
                                    internalQuantity || 0,
                                    contentArea?._id,
                                    contentArea?.productKey,
                                    contentArea?.image,
                                    contentArea?.price
                                )
                            }
                        >
                            <FaCartShopping aria-hidden="true" />
                            <span>Dodaj</span>
                        </button>
                    </div>
                </FormProvider>
            </div>
        </div>
    );
}

export default ContentArea;
