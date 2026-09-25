import { useEffect, useState } from "react";
import { signInWithEmailAndPassword, signOut, onIdTokenChanged } from "firebase/auth";
import { useRouter } from "next/router";
import { FirebaseError } from "firebase/app";
import { auth } from "@/config/firebase";
import { COMMERCIAL_OWNER_EMAIL } from "@/config/site";
import { useAuth } from "@/hooks/useAuth";
import styles from "./CommercialAccessGate.module.css";

const errorMap = {
    "auth/invalid-email": "Nevažeći e-mail.",
    "auth/invalid-credential": "E-mail ili lozinka nisu ispravni.",
    "auth/too-many-requests": "Previše pokušaja. Pokušaj ponovo kasnije.",
};

export default function CommercialAccessGate({ children }) {
    const router = useRouter();
    const { user, loading } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const isOwner =
        user?.email?.toLowerCase() === COMMERCIAL_OWNER_EMAIL.toLowerCase();

    useEffect(() => {
        if (user && !isOwner) {
            fetch("/api/auth/session", { method: "DELETE" });
            signOut(auth).finally(() => {
                setErrorMessage("Ovaj sajt je dostupan samo vlasniku.");
            });
        }
    }, [isOwner, user]);

    useEffect(() => onIdTokenChanged(auth, async (currentUser) => {
        if (!currentUser || currentUser.email?.toLowerCase() !== COMMERCIAL_OWNER_EMAIL) {
            setSessionReady(false);
            return;
        }
        try {
            const token = await currentUser.getIdToken();
            const response = await fetch("/api/auth/session", {
                method: "POST", headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Session verification failed");
            setSessionReady(true);
            if (router.pathname === "/auth/login") await router.replace("/");
        } catch {
            setSessionReady(false);
            setErrorMessage("Prijava nije potvrđena. Pokušaj ponovo.");
            await signOut(auth);
        }
    }), [router]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setErrorMessage("");

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") || "").trim();
        const password = String(formData.get("password") || "");

        try {
            const credential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            if (
                credential.user.email?.toLowerCase() !==
                COMMERCIAL_OWNER_EMAIL.toLowerCase()
            ) {
                await signOut(auth);
                setErrorMessage("Ovaj sajt je dostupan samo vlasniku.");
            }
        } catch (error) {
            setErrorMessage(
                error instanceof FirebaseError
                    ? errorMap[error.code] || "Prijava nije uspela."
                    : "Prijava nije uspela."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || (user && !isOwner)) {
        return <div className={styles.loading}>Provera pristupa...</div>;
    }

    if (isOwner) {
        if (!sessionReady || router.pathname === "/auth/login") {
            return <div className={styles.loading}>Otvaram katalog...</div>;
        }
        return children;
    }

    return (
        <main className={styles.page}>
            <section className={styles.card}>
                <img src="/logo.png" alt="Marbok" className={styles.logo} />
                <p className={styles.eyebrow}>Marbok B2B</p>
                <h1 className={styles.title}>Prijavljivanje</h1>
                <p className={styles.description}>
                    Prijavi se da otvoriš B2B katalog.
                </p>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <label className={styles.label}>
                        E-mail
                        <input
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className={styles.input}
                        />
                    </label>
                    <label className={styles.label}>
                        Lozinka
                        <input
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className={styles.input}
                        />
                    </label>
                    {errorMessage && (
                        <p className={styles.error}>{errorMessage}</p>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={styles.button}
                    >
                        {isSubmitting ? "Prijavljivanje..." : "Prijavi se"}
                    </button>
                </form>
            </section>
        </main>
    );
}
