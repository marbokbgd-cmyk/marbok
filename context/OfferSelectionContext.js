import { createContext, useContext, useEffect, useMemo, useState } from "react";

const OfferSelectionContext = createContext(null);
const STORAGE_KEY = "marbok-admin-offer-selection";

export function OfferSelectionProvider({ children }) {
    const [selectedProducts, setSelectedProducts] = useState([]);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            if (Array.isArray(saved)) setSelectedProducts(saved);
        } catch {}
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
        } catch {}
    }, [selectedProducts]);

    const toggleProduct = (product) => {
        const key = product?._id || product?.productKey;
        if (!key) return;
        setSelectedProducts((current) => {
            const exists = current.some((item) => (item?._id || item?.productKey) === key);
            return exists
                ? current.filter((item) => (item?._id || item?.productKey) !== key)
                : [...current, product];
        });
    };

    const isSelected = (product) => {
        const key = product?._id || product?.productKey;
        return selectedProducts.some((item) => (item?._id || item?.productKey) === key);
    };

    const value = useMemo(() => ({
        selectedProducts,
        selectedCount: selectedProducts.length,
        toggleProduct,
        isSelected,
        clearSelection: () => setSelectedProducts([]),
    }), [selectedProducts]);

    return <OfferSelectionContext.Provider value={value}>{children}</OfferSelectionContext.Provider>;
}

export function useOfferSelection() {
    const context = useContext(OfferSelectionContext);
    if (!context) throw new Error("useOfferSelection must be used inside OfferSelectionProvider");
    return context;
}
