import Layout from "@/components/Layout/Layout";
import { LoginForm } from "@/components/LoginForm/LoginForm";
import { getPages, getCategories, getStores } from "@/sanity/sanity-utils";
import { usePages, useCategories } from "@/hooks/usePages";
import { IS_COMMERCIAL_SITE } from "@/config/site";

function Login({ initialPages, initialCategory, initialStores }) {
    const pages = usePages() || initialPages;
    const categories = useCategories() || initialCategory;
    return (
        <Layout pages={pages} categories={categories} stores={initialStores}>
            {(filteredProducts) => <LoginForm />}
        </Layout>
    );
}
export default Login;
export async function getServerSideProps() {
    if (IS_COMMERCIAL_SITE) return { props: { initialPages: { content: [] }, initialCategory: [], initialStores: [] } };
    const [initialPages, initialCategory, initialStores] = await Promise.all([getPages(), getCategories(), getStores()]);
    return { props: { initialPages, initialCategory, initialStores } };
}
