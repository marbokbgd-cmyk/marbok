import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import styles from "./AccountStatus.module.css";
export default function AccountStatus({ full = false }) {
    const { authUser, status, loading, error, refreshAccess, signOutUser } = useAuth();
    if (status === "approved" || (!full && !authUser)) return null;
    return <section className={styles.notice} aria-live="polite">
        <h2>{loading ? "Proveravamo pristup…" : status === "rejected" ? "Zahtev nije odobren" : status === "error" ? "Provera naloga nije uspela" : authUser ? "Nalog čeka odobrenje" : "Prijavi se za pristup cenama"}</h2>
        <p>{error || (authUser ? status === "rejected" ? "Za dodatne informacije kontaktiraj Marbok." : "Nakon pregleda podataka i odobrenja naloga moći ćeš da vidiš cene i šalješ porudžbine." : "Cene i poručivanje dostupni su odobrenim kupcima.")}</p>
        <div className={styles.actions}>{authUser ? <>
            <button type="button" disabled={loading} onClick={refreshAccess}>Proveri status</button>
            {!full && <Link href="/auth/pending">Moji podaci</Link>}
            <button type="button" onClick={signOutUser}>Odjavi se</button>
        </> : <Link href="/auth/login">Prijavi se</Link>}</div>
    </section>;
}
