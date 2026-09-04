import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/hooks/useAuth";
import AccountStatus from "@/components/AccountStatus/AccountStatus";
import styles from "@/pages/users/Users.module.css";
const fields = [["name", "Ime i prezime"], ["companyName", "Naziv firme"], ["pib", "PIB"], ["address", "Adresa"], ["phone", "Telefon"]];
export default function Pending() {
    const { authUser, loading, status, profile, refreshAccess } = useAuth();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    useEffect(() => { if (status === "approved") router.replace("/"); }, [status, router]);
    async function save(event) {
        event.preventDefault(); if (saving || !authUser) return;
        setSaving(true); setMessage("");
        const values = Object.fromEntries(fields.map(([key]) => [key, event.currentTarget.elements[key].value.trim()]));
        try {
            await setDoc(doc(db, "users", authUser.uid), {
                ...values, uid: authUser.uid, email: authUser.email,
                ...(!profile ? { roles: ["user"], createdDay: new Date().toISOString(), approvalStatus: "pending" } : {}),
            }, { merge: true });
            await refreshAccess(); setMessage("Podaci su sačuvani.");
        } catch { setMessage("Podaci nisu sačuvani. Pokušaj ponovo ili kontaktiraj Marbok."); }
        finally { setSaving(false); }
    }
    return <main className={styles.container}>
        <Link href="/" className={styles.back}>← Nazad na sajt</Link>
        <AccountStatus full />
        {authUser && !loading && status !== "error" && status !== "approved" && <section className={styles.card}>
            <h1>Tvoji podaci za proveru</h1><p>{authUser.email}</p>
            <form onSubmit={save} key={profile?.uid || "new"} className={styles.form}>
                {fields.map(([key, label]) => <label key={key}>{label}<input name={key} defaultValue={profile?.[key] || ""}
                    required maxLength={key === "pib" ? 9 : key === "phone" ? 40 : 200}
                    pattern={key === "pib" ? "[0-9]{9}" : undefined} inputMode={key === "pib" ? "numeric" : undefined}
                    type={key === "phone" ? "tel" : "text"} /></label>)}
                <button disabled={saving}>{saving ? "Čuvam…" : "Sačuvaj podatke"}</button>
                <p role="status">{message}</p>
            </form>
        </section>}
    </main>;
}
