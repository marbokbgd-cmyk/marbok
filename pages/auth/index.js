import Layout from "@/components/Layout/Layout";
import styles from "./Authentication.module.css";
import Button from "@/components/Button/Button";
import { getPages, getCategories, getStores } from "@/server/content";
import { usePages, useCategories } from "@/hooks/usePages";
import { FaUserPlus, FaSignInAlt } from "react-icons/fa";

function Authentication({ initialPages, initialCategory, initialStores }) {
    const pages = usePages() || initialPages;
    const categories = useCategories() || initialCategory;

    return (
        <Layout pages={pages} categories={categories} stores={initialStores}>
            {(filteredProducts) => (
                <div className={styles.container}>
                    <div className={styles.authWrapper}>
                        <h1 className={styles.title}>Dobrodošli</h1>
                        <div className={styles.contentBoxesContainer}>
                            <div className={styles.contentContainer}>
                                <div className={styles.contentWrapper}>
                                    <div className={styles.iconWrapper}>
                                        <FaUserPlus className={styles.icon} />
                                    </div>
                                    <h2 className={styles.cardTitle}>
                                        Novi korisnik?
                                    </h2>
                                    <p className={styles.containerText}>
                                        Ukoliko još uvek nemaš, kreiraj svoj
                                        nalog!
                                    </p>
                                    <Button
                                        theme="primary"
                                        content="Kreiraj nalog"
                                        size="regular"
                                        href={"/auth/signup"}
                                    />
                                </div>
                            </div>
                            <div className={styles.divider}>
                                <span>ili</span>
                            </div>
                            <div className={styles.contentContainer}>
                                <div className={styles.contentWrapper}>
                                    <div className={styles.iconWrapper}>
                                        <FaSignInAlt className={styles.icon} />
                                    </div>
                                    <h2 className={styles.cardTitle}>
                                        Već imaš nalog?
                                    </h2>
                                    <p className={styles.containerText}>
                                        Ukoliko već imaš otvoren nalog, prijavi
                                        se!
                                    </p>
                                    <Button
                                        theme="primary"
                                        content="Prijavi se"
                                        size="regular"
                                        href={"auth/login"}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default Authentication;
export async function getServerSideProps() {
    const initialPages = await getPages();
    const initialCategory = await getCategories();
    const initialStores = await getStores();

    return {
        props: { initialPages, initialCategory, initialStores },
    };
}
