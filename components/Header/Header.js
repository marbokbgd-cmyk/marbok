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
import { useOfferSelection } from "@/context/OfferSelectionContext";

const OFFER_OWNER_EMAIL = "nikola.borisavljevic.bgd@gmail.com";

function Header({ category, setFilteredProducts, categories, stores }) {
    const { user } = useAuth();
    const { data: userData } = useGetCurrentUser({ uid: user?.uid ?? null });
    const roles = useMemo(() => userData?.roles || [], [userData]);
    const isAdmin = roles.includes("admin");
    const isMerchandiser = roles.includes("merchand");
    const canCreateOffer = user?.email?.toLowerCase() === OFFER_OWNER_EMAIL;
    const { selectedProducts, selectedCount, clearSelection } = useOfferSelection();
    const router = useRouter();
    const { selectedStore,isStoreSelectorOpen,setIsStoreSelectorOpen,handleStoreSelect }=useStore();
    const isCategoryPage=router.pathname==="/category/[slug]";
    const isLg=useMediaQuery(1380);
    const handleSearch=(e)=>{const query=e.target.value.toLowerCase();const filtered=category.categoryProducts.flatMap(page=>page.contentArea?.filter(area=>(area.name||"").toLowerCase().includes(query)||(area.productKey||"").toLowerCase().includes(query)));setFilteredProducts(()=>query===""?[]:filtered);};

    return <><div className={styles.logoWrapper}>
        <Link href="/"><img className={styles.logo} src="/logo.png" alt="Logo"/></Link>
        {isCategoryPage&&<div className={styles.searchContainer}><input type="search" placeholder="Pretraži..." onChange={handleSearch} className={styles.searchInput}/>{!isLg&&(isAdmin||isMerchandiser)&&<button className={styles.storeButton} onClick={()=>setIsStoreSelectorOpen(true)}><MdStorefront className={styles.storeIcon}/><span className={styles.storeButtonText}>{selectedStore?selectedStore.name:"Izaberi Prodavnicu"}</span></button>}</div>}
        <div className={styles.cartNavWrapper}>
            {!isCategoryPage&&!isLg&&(isAdmin||isMerchandiser)&&<button className={styles.storeButton} onClick={()=>setIsStoreSelectorOpen(true)}><MdStorefront className={styles.storeIcon}/><span className={styles.storeButtonText}>{selectedStore?selectedStore.name:"Izaberi Prodavnicu"}</span></button>}
            {!isLg&&<Navigation categories={categories} isAdmin={isAdmin}/>} 
            {canCreateOffer&&selectedCount>0&&<><span style={{fontWeight:700,whiteSpace:"nowrap"}}>Ponuda: {selectedCount}</span><CatalogExportButton selectedProducts={selectedProducts}/><button type="button" onClick={clearSelection} style={{border:0,background:"transparent",cursor:"pointer",textDecoration:"underline"}}>Obriši izbor</button></>}
            <Cart/>{(isLg||isCategoryPage)&&<NavigationMobile category={category} categories={categories} isAdmin={isAdmin}/>} 
        </div>
        <StoreSelector stores={stores} isOpen={isStoreSelectorOpen} onClose={()=>setIsStoreSelectorOpen(false)} onStoreSelect={(store)=>{handleStoreSelect(store);setIsStoreSelectorOpen(false);}}/>
    </div>{isLg&&(isAdmin||isMerchandiser)&&<button className={styles.storeButtonMobile} onClick={()=>setIsStoreSelectorOpen(true)}><MdStorefront className={styles.storeIcon}/><span className={styles.storeButtonText}>{selectedStore?selectedStore.name:"Izaberi Prodavnicu"}</span></button>}</>;
}
export default Header;
