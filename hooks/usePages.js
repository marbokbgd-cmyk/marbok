import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getPages, getImages, getHeading, getBrandImages, getAboutUs, getCategories, getStores } from "@/sanity/sanity-utils";
import { isOwner } from "@/utils/adminAccess";
function useContent(reader, ownerOnly = false) {
    const { user, loading, status } = useAuth();
    const key = `${user?.uid || "public"}:${status}`;
    const [state, setState] = useState({ key: null, data: null });
    useEffect(() => {
        let active = true;
        if (loading || (ownerOnly && !isOwner(user))) return;
        reader().then(data => { if (active) setState({ key, data }); }).catch(() => {
            if (active) setState({ key, data: null });
        });
        return () => { active = false; };
    }, [reader, key, loading, ownerOnly, user]);
    return state.key === key ? state.data : null;
}
export const usePages = () => useContent(getPages);
export const useHeroImages = () => useContent(getImages);
export const useHeading = () => useContent(getHeading);
export const useBrandImages = () => useContent(getBrandImages);
export const useAboutUs = () => useContent(getAboutUs);
export const useCategories = () => useContent(getCategories);
export const useStores = () => useContent(getStores, true);
