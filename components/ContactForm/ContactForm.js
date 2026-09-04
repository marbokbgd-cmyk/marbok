import React, { useState, useEffect, useRef } from "react";
import styles from "../Input/Input.module.css";
import { useForm, FormProvider } from "react-hook-form";
import Button from "@/components/Button/Button";
import Input from "@/components/Input/Input";
import Textarea from "@/components/TextArea/TextArea";
import emailjs from "@emailjs/browser";
import { useCart } from "@/hooks/useCart";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { createOrder, uploadOrderExcel } from "@/sanity/sanity-utils";
import { createOrderExcelFile } from "@/utils/orderExcel";

const EMAIL_SERVICE_ID = "service_pn5jvkb";
const EMAIL_TEMPLATE_ID = "template_ji1obt8";
const EMAIL_PUBLIC_KEY = "vEKyEbs258TNVtxqI";

function ContactForm({ selectedStore }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { cart, clearCart } = useCart();
    const methods = useForm();
    const router = useRouter();
    const {
        handleSubmit,
        formState: { errors },
        setValue,
    } = methods;

    const expression =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    const triggerEmail = async (data) => {
        try {
            await emailjs.send(
                EMAIL_SERVICE_ID,
                EMAIL_TEMPLATE_ID,
                data,
                EMAIL_PUBLIC_KEY
            );
            return true;
        } catch (error) {
            console.error("Failed to send email", error);
            return false;
        }
    };
    const onSubmit = (cart) => async (data) => {
        if (isSubmitting) return;
        if (!cart?.length) {
            toast.error("Dodajte bar jedan proizvod u korpu.");
            return;
        }

        setIsSubmitting(true);
        const { firstName, email, phone, message } = data;

        const orderData = {
            firstName,
            email,
            phone,
            message,
            pib: selectedStore?.pib || "",
            pass: selectedStore?.pass || "",
            items: cart.map((item) => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                productKey: item.productKey,
                price: item.price,
            })),
        };

        try {
            const order = await createOrder(orderData);
            const confirmedItems = order.items.map(item => ({ ...cart.find(product => product.productId === item.productId), ...item }));
            const orderUrl = `${window.location.origin}/order/${order.orderNumber}`;

            let orderExcelUrl = null;
            try {
                const orderExcel = await createOrderExcelFile({
                    orderNumber: order.orderNumber,
                    customer: { name: firstName, email, phone },
                    selectedStore,
                    items: confirmedItems,
                });
                orderExcelUrl = await uploadOrderExcel(
                    orderExcel,
                    order.orderNumber
                );
            } catch (excelError) {
                console.error("Failed to create or upload order Excel", excelError);
            }

            const excelLine = orderExcelUrl
                ? `\n\nExcel porudžbina (preuzimanje): ${orderExcelUrl}`
                : "";
            const emailData = {
                firstName,
                email,
                phone,
                orderNumber: order.orderNumber,
                orderExcelUrl: orderExcelUrl || "",
                message: `${message || ""}\n\nLink ka potvrdi porudžbine: ${orderUrl}${excelLine}\n\nProizvodi:\n${confirmedItems
                    ?.map(
                        (item) =>
                            `proizvod: ${item.name}, kolicina: ${item.quantity}, šifra: ${item.productKey}, cena: ${item.price}`
                    )
                    .join("\n")}`,
            };

            const emailSent = await triggerEmail(emailData);

            clearCart();
            if (emailSent && orderExcelUrl) {
                toast.success(
                    "Porudžbina je poslata. Excel je dostupan u emailu."
                );
            } else if (emailSent) {
                toast.warning(
                    "Porudžbina je poslata, ali Excel nije napravljen."
                );
            } else {
                toast.warning(
                    "Porudžbina je sačuvana, ali email obaveštenje nije poslato."
                );
            }
            router.push(`/order/${order.orderNumber}`);
        } catch (error) {
            console.error("Failed to create order:", error);
            toast.error("Došlo je do greške! Molimo pokušajte ponovo!");
        } finally {
            setIsSubmitting(false);
        }
    };

    const previousStore = useRef(null);
    useEffect(() => {
        if (selectedStore) {
            setValue("firstName", selectedStore.name);
            setValue("email", selectedStore.email);
            setValue("phone", selectedStore.phone);
        } else if (previousStore.current) {
            setValue("firstName", "");
            setValue("email", "");
            setValue("phone", "");
        }
        previousStore.current = selectedStore;
    }, [selectedStore, setValue]);

    const clearInputError = (fieldName) => {
        if (errors[fieldName]) {
            methods.clearErrors(fieldName);
        }
    };

    return (
        <div className={`${styles.sectionWrapper} ${styles.formSection}`}>
            <div className={styles.formWrapper}>
                <h1 className={styles.contactHeader}>Pošaljite porudžbinu</h1>
                <p className={styles.subtitle}>
                    Proverite korpu i unesite podatke za porudžbinu.
                </p>
                {selectedStore && (
                    <div className={styles.selectedStore}>
                        <span>Porudžbina za</span>
                        <strong>{selectedStore.name}</strong>
                        <small>
                            {selectedStore.pib && `PIB: ${selectedStore.pib}`}
                            {selectedStore.pass &&
                                ` · Šifra kupca: ${selectedStore.pass}`}
                        </small>
                    </div>
                )}
                {!cart?.length && (
                    <div className={styles.emptyCartWarning}>
                        Korpa je prazna. Dodajte proizvode pre slanja porudžbine.
                    </div>
                )}
                <FormProvider {...methods}>
                    <form
                        className={styles.form}
                        onSubmit={handleSubmit(onSubmit(cart))}
                    >
                        <Input
                            label="Ime"
                            inputType="text"
                            placeholder="Tvoje ime..."
                            registerField="firstName"
                            required
                            minLength={3}
                            onChange={() => clearInputError("firstName")}
                        />
                        <Input
                            label="Email"
                            inputType="text"
                            placeholder="Tvoja Email Adresa... "
                            registerField="email"
                            required
                            expression={expression}
                            errorMsg="email adresu"
                            onChange={() => clearInputError("email")}
                        />
                        <Input
                            label="Kontakt telefon"
                            inputType="text"
                            placeholder="Tvoj Kontakt telefon... "
                            registerField="phone"
                            required
                            onChange={() => clearInputError("phone")}
                        />
                        <Textarea
                            label="Poruka"
                            placeholder="Dodatna napomena za porudžbinu..."
                            registerField="message"
                        />
                        <Button
                            btnType="submit"
                            theme="primary"
                            content={
                                isSubmitting
                                    ? "Šaljem porudžbinu..."
                                    : "Pošalji porudžbinu"
                            }
                            size="fullWidth"
                            disable={
                                Object.keys(errors).length > 0 ||
                                isSubmitting ||
                                !cart?.length
                            }
                            className={styles.submitButton}
                        />
                    </form>
                </FormProvider>
            </div>
        </div>
    );
}

export default ContactForm;
