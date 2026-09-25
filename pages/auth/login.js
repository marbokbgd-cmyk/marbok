import Layout from "@/components/Layout/Layout";
import { LoginForm } from "@/components/LoginForm/LoginForm";
import { getPages, getCategories, getStores } from "@/sanity/sanity-utils";
import { usePages, useCategories } from "@/hooks/usePages";

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
    const initialPages = await getPages();
    const initialCategory = await getCategories();
    const initialStores = await getStores();

    return {
        props: { initialPages, initialCategory, initialStores },
    };
}
