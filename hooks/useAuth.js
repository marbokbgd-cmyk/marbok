import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { auth } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [authUser, setAuthUser] = useState(null);
    const [state, setState] = useState({ uid: null, status: "loading", profile: null, error: "" });
    const generation = useRef(0);
    const refreshAccess = useCallback(async () => {
        const current = auth.currentUser;
        const request = ++generation.current;
        if (!current) { setState({ uid: null, status: "anonymous", profile: null, error: "" }); return; }
        try {
            const token = await current.getIdToken();
            const response = await fetch("/api/account", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Provera naloga nije uspela.");
            if (request === generation.current && auth.currentUser?.uid === current.uid)
                setState({ uid: current.uid, ...result, error: "" });
        } catch (error) {
            if (request === generation.current && auth.currentUser?.uid === current.uid)
                setState({ uid: current.uid, status: "error", profile: null, error: error.message });
        }
    }, []);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, current => {
            ++generation.current;
            setAuthUser(current);
            setState({ uid: current?.uid || null, status: current ? "loading" : "anonymous", profile: null, error: "" });
            refreshAccess();
        });
        const timer = setInterval(() => { if (auth.currentUser) refreshAccess(); }, 30000);
        const focus = () => refreshAccess();
        window.addEventListener("focus", focus);
        return () => { unsubscribe(); clearInterval(timer); window.removeEventListener("focus", focus); ++generation.current; };
    }, [refreshAccess]);
    const signOutUser = useCallback(async () => { ++generation.current; await auth.signOut(); }, []);
    const approved = state.uid === authUser?.uid && state.status === "approved";
    return <AuthContext.Provider value={{
        user: approved ? authUser : null, authUser, loading: state.status === "loading",
        status: state.status, profile: state.profile, error: state.error, refreshAccess, signOutUser,
    }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
