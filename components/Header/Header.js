import { useMemo } from "react";
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
import { useGetCurrentUser } from "@/hooks/useGetCurrentUser";
import { useAuth } from "@/hooks/useAuth";
import CatalogExportButton from "@/components/CatalogExportButton/CatalogExportButton";

function Header({ category, setFilteredProducts, categories, stores }) {
    const { user } = useAuth();
    const { data: userData } = useGetCurrentUser({ uid: user?.uid ?? null });
    const roles = useMemo(() => userData?.roles || [], [userData]);
    const isAdmin = roles.includes("admin");
    const isMerchandiser = roles.includes("merchand");

    const router = useRouter();
    const {
        selectedStore,
        isStoreSelectorOpen,
        setIsStoreSelectorOpen,
        handleStoreSelect,
    } = useStore();
    const pathName = router.pathname;
    const isCategoryPage = pathName === "/category/[slug]";
    const isMd = useMediaQuery(1000);
    const isLg = useMediaQuery(1380);

    const handleSearch = (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = category.categoryProducts.flatMap((page) =>
            page.contentArea?.filter((area) => {
                return (
                    area.name.toLowerCase().includes(query) ||
                    area.productKey.toLowerCase().includes(query)
                );
            })
        );

        setFilteredProducts((prevFilteredProducts) => {
            if (query === "") {
                return [];
            } else {
                return filtered;
            }
        });
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
                            placeholder="Pretraži..."
                            onChange={handleSearch}
                            className={styles.searchInput}
                        />
                        {(isAdmin || isMerchandiser) && (
                            <button
                                className={styles.storeButton}
                                onClick={() => setIsStoreSelectorOpen(true)}
                            >
                                <MdStorefront className={styles.storeIcon} />
                                <span className={styles.storeButtonText}>
                                    {selectedStore
                                        ? selectedStore.name
                                        : "Izaberi Prodavnicu"}
                                </span>
                            </button>
                        )}
                    </div>
                )}
                {isCategoryPage && isLg && (
                    <div className={styles.searchContainer}>
                        <input
                            type="search"
                            placeholder="Pretraži..."
                            onChange={handleSearch}
                            className={styles.searchInput}
                        />
                    </div>
                )}
                {/* <Link href={`/`}>
                    <img className={styles.logo} src="/logo.png" alt="Logo" />
                </Link> */}
                <div className={styles.cartNavWrapper}>
                    {!isCategoryPage &&
                        !isLg &&
                        (isAdmin || isMerchandiser) && (
                            <button
                                className={styles.storeButton}
                                onClick={() => setIsStoreSelectorOpen(true)}
                            >
                                <MdStorefront className={styles.storeIcon} />
                                <span className={styles.storeButtonText}>
                                    {selectedStore
                                        ? selectedStore.name
                                        : "Izaberi Prodavnicu"}
                                </span>
                            </button>
                        )}
                    {!isLg && (
                        <Navigation categories={categories} isAdmin={isAdmin} />
                    )}
                    {user && (
                        <CatalogExportButton categories={categories || []} />
                    )}
                    <Cart />
                    {(isLg || isCategoryPage) && (
                        <NavigationMobile
                            category={category}
                            categories={categories}
                            isAdmin={isAdmin}
                        />
                    )}
                </div>
                <StoreSelector
                    stores={stores}
                    isOpen={isStoreSelectorOpen}
                    onClose={() => setIsStoreSelectorOpen(false)}
                    onStoreSelect={(store) => {
                        handleStoreSelect(store);
                        setIsStoreSelectorOpen(false);
                    }}
                />
            </div>
            {isLg && (isAdmin || isMerchandiser) && (
                <button
                    className={styles.storeButtonMobile}
                    onClick={() => setIsStoreSelectorOpen(true)}
                >
                    <MdStorefront className={styles.storeIcon} />
                    <span className={styles.storeButtonText}>
                        {selectedStore
                            ? selectedStore.name
                            : "Izaberi Prodavnicu"}
                    </span>
                </button>
            )}
        </>
    );
}

export default Header;
