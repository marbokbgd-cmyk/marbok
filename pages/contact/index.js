import { useAuth } from "@/hooks/useAuth";
import AccountStatus from "@/components/AccountStatus/AccountStatus";
import ContactForm from "@/components/ContactForm/ContactForm";
import styles from "./Contact.module.css";
import { getPages, getCategories, getStores } from "@/server/content";
import { usePages, useCategories } from "@/hooks/usePages";
import Layout from "@/components/Layout/Layout";
import { useCart } from "@/hooks/useCart";
import Checkout from "@/components/Checkout/Checkout";

import { useStore } from "@/context/StoreContext";

function Contact({ initialPages, initialCategory, initialStores }) {
    const { user } = useAuth();
    const pages = usePages() || initialPages;
    const categories = useCategories() || initialCategory;
    const { cart, removeFromCart, updateCartQuantity } = useCart();
    const { selectedStore } = useStore();

    return (
        <Layout pages={pages} categories={categories} stores={initialStores}>
            {(filteredProducts) => (
                <div className={styles.container}>
                    {user ? <><Checkout
                        cart={cart}
                        removeFromCart={removeFromCart}
                        updateCartQuantity={updateCartQuantity}
                    />
                    <div className={styles.line}></div>
                    <ContactForm selectedStore={selectedStore} /></> : <AccountStatus full />}
                </div>
            )}
        </Layout>
    );
}

export async function getServerSideProps({ req }) {
    const initialPages = await getPages();
    const initialCategory = await getCategories();
    const initialStores = await getStores();

    return {
        props: {
            initialPages,
            initialCategory,
            initialStores,
        },
    };
}

export default Contact;
