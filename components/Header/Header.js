import { useStores } from "@/hooks/usePages";
import { isOwner } from "@/utils/adminAccess";
import NavigationMobile from "@/components/NavigationMobile/NavigationMobile";
import styles from "@/pages/category/page.module.css";
import Cart from "@/components/Cart/Cart";
import Link from "next/link";
import { useRouter } from "next/router";
import Navigation from "@/components/Navigation/Navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import StoreSelector from "@/components/StoreSelector/StoreSelector";
import { useStore } from "@/context/StoreContext";
import { MdStorefront } from "react-icons/md";

import { useAuth } from "@/hooks/useAuth";
import CatalogExportButton from "@/components/CatalogExportButton/CatalogExportButton";

function normalizeSearchValue(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("sr-Latn-RS")
        .trim();
}

function Header({
    category,
    setFilteredProducts,
    searchQuery,
    setSearchQuery,
    categories,
    stores,
}) {
    const { user } = useAuth();
    const isAdmin = isOwner(user);
    const ownerStores = useStores();
    const canExportCatalog = isAdmin;

    const router = useRouter();
    const {
        selectedStore,
        isStoreSelectorOpen,
        setIsStoreSelectorOpen,
        handleStoreSelect,
        clearStoreSelection,
    } = useStore();
    const pathName = router.pathname;
    const isCategoryPage = pathName === "/category/[slug]";
    const isLg = useMediaQuery(1380);

    const handleSearch = (e) => {
        const inputValue = e.target.value;
        const query = normalizeSearchValue(inputValue);
        setSearchQuery(inputValue);

        const filtered = (category?.categoryProducts || []).flatMap((page) =>
            (page?.contentArea || []).filter((area) => {
                const name = normalizeSearchValue(area?.name);
                const productKey = normalizeSearchValue(area?.productKey);
                return (
                    name.includes(query) ||
                    productKey.includes(query)
                );
            })
        );

        setFilteredProducts(query ? filtered : []);
    };

    return (
        <>
            <div className={styles.logoWrapper}>
                <Link href={`/`}>
                    <img className={styles.logo} src="/logo.png" alt="Logo" />
                </Link>
                {isCategoryPage && !isLg && (
                    <div className={styles.searchContainer}>
                        <input
                            type="search"
                            placeholder="Naziv ili šifra proizvoda..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className={styles.searchInput}
                            aria-label="Pretraži proizvode po nazivu ili šifri"
                        />
                    </div>
                )}
                {isCategoryPage && isLg && (
                    <div className={styles.searchContainer}>
                        <input
                            type="search"
                            placeholder="Naziv ili šifra proizvoda..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className={styles.searchInput}
                            aria-label="Pretraži proizvode po nazivu ili šifri"
                        />
                    </div>
                )}
                {/* <Link href={`/`}>
                    <img className={styles.logo} src="/logo.png" alt="Logo" />
                </Link> */}
                <div className={styles.cartNavWrapper}>
                    {!isLg && (
                        <Navigation categories={categories} isAdmin={isAdmin} />
                    )}
                    {canExportCatalog && !isLg && (
                        <CatalogExportButton categories={categories || []} />
                    )}
                    {isAdmin && (
                        <button type="button"
                            className={`${styles.storeAction} ${selectedStore ? styles.storeActionSelected : ""}`}
                            onClick={() => setIsStoreSelectorOpen(true)}
                            aria-label={selectedStore ? `Promeni prodavnicu: ${selectedStore.name}` : "Izaberi prodavnicu"}
                            title={selectedStore ? selectedStore.name : "Izaberi prodavnicu"}
                            aria-haspopup="dialog" aria-expanded={isStoreSelectorOpen}>
                            <MdStorefront aria-hidden="true" />
                            <span>{selectedStore ? "Izabrana" : "Prodavnica"}</span>
                        </button>
                    )}
                    <Cart />
                    {(isLg || isCategoryPage) && (
                        <NavigationMobile
                            category={category}
                            categories={categories}
                            isAdmin={isAdmin}
                            showCatalogExport={canExportCatalog && isLg}
                        />
                    )}
                </div>
                {isAdmin && <StoreSelector
                    stores={ownerStores || []}
                    selectedStore={selectedStore}
                    onClearSelection={clearStoreSelection}
                    isOpen={isStoreSelectorOpen}
                    onClose={() => setIsStoreSelectorOpen(false)}
                    onStoreSelect={(store) => {
                        handleStoreSelect(store);
                        setIsStoreSelectorOpen(false);
                    }}
                />}
            </div>
        </>
    );
}

export default Header;
