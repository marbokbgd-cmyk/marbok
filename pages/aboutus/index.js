import styles from "./AboutUs.module.css";
import {
    getPages,
    getAboutUs,
    getCategories,
    getStores,
} from "@/server/content";
import { usePages, useAboutUs, useCategories } from "@/hooks/usePages";
import Layout from "@/components/Layout/Layout";
import AboutUsContainer from "@/components/AboutUs/AboutUsContainer";
import Heading from "@/components/Heading/Heading";

function AboutUs({
    initialPages,
    initialAboutUs,
    initialCategory,
    initialStores,
}) {
    const pages = usePages() || initialPages;
    const aboutUs = useAboutUs() || initialAboutUs;
    const categories = useCategories() || initialCategory;

    return (
        <Layout pages={pages} categories={categories} stores={initialStores}>
            {(filteredProducts) => (
                <div className={styles.pageWrapper}>
                    <Heading
                        mainHeading={aboutUs?.[0]}
                        className={styles.containerClassName}
                        wrapperClassName={styles.wrapperClassName}
                        headingClassName={styles.headingClassName}
                    />

                    <div className={styles.container}>
                        <AboutUsContainer />
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2830.997608496366!2d20.37932527616346!3d44.80123737742801!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x475a6f74960dd877%3A0x19193fc2b6b63a9c!2sNehruova%2051%2C%20Nehruova%2051%2C%20Beograd%2011078!5e0!3m2!1sen!2srs!4v1711730087253!5m2!1sen!2srs"
                            loading="lazy"
                            className={styles.map}
                        ></iframe>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default AboutUs;

export async function getServerSideProps() {
    const initialPages = await getPages();
    const initialAboutUs = await getAboutUs();
    const initialCategory = await getCategories();
    const initialStores = await getStores();

    return {
        props: { initialPages, initialAboutUs, initialCategory, initialStores },
    };
}
