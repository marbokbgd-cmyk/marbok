import { Dialog } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/hooks/useAuth";
import { isOwner } from "@/utils/adminAccess";
import styles from "./Users.module.css";
const labels = { pending: "Čeka odobrenje", approved: "Odobren", rejected: "Odbijen", legacy: "Postojeći nalog" };
const normalize = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "dj").toLowerCase();
export default function Users() {
    const { user, loading } = useAuth();
    const [users, setUsers] = useState([]), [filter, setFilter] = useState("pending"), [search, setSearch] = useState("");
    const [error, setError] = useState(""), [fetching, setFetching] = useState(true), [busy, setBusy] = useState(null);
    const [confirm, setConfirm] = useState(null);
    useEffect(() => {
        if (!isOwner(user)) { setUsers([]); return; }
        setFetching(true);
        return onSnapshot(collection(db, "users"), snapshot => {
            setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(item => item.id !== user.uid));
            setFetching(false); setError("");
        }, () => { setError("Korisnici nisu učitani. Potrebno je proveriti Firebase pravila pristupa."); setFetching(false); });
    }, [user]);
    const visible = useMemo(() => users.filter(item => (filter === "all" || (item.approvalStatus || "legacy") === filter)
        && normalize([item.name, item.companyName, item.pib, item.email, item.phone, item.address].join(" ")).includes(normalize(search)))
        .sort((a, b) => String(b.createdDay || "").localeCompare(String(a.createdDay || ""))), [users, filter, search]);
    async function decide(item, status) {
        if (busy) return; setBusy(item.id); setError("");
        try {
            const token = await user.getIdToken();
            const response = await fetch(`/api/users/${encodeURIComponent(item.id)}`, { method: "PATCH",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
            const result = await response.json(); if (!response.ok) throw new Error(result.error);
            setConfirm(null);
        } catch (error) { setError(error.message || "Odluka nije sačuvana."); }
        finally { setBusy(null); }
    }
    if (loading) return <main className={styles.container}>Proveravamo pristup…</main>;
    if (!isOwner(user)) return <main className={styles.container}><p>Ova stranica je dostupna samo vlasniku.</p><Link href="/">Nazad na sajt</Link></main>;
    return <main className={styles.container}>
        <Link href="/" className={styles.back}>← Nazad na sajt</Link>
        <h1>Korisnici</h1><p>Pregledaj poslovne podatke pre odobravanja pristupa cenama i poručivanju.</p>
        <div className={styles.filters}>
            <label>Pretraga<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Firma, ime, PIB, mejl…" /></label>
            <label>Status<select value={filter} onChange={e => setFilter(e.target.value)}>
                <option value="pending">Na čekanju ({users.filter(item => item.approvalStatus === "pending").length})</option>
                <option value="approved">Odobreni</option><option value="rejected">Odbijeni</option><option value="legacy">Postojeći</option><option value="all">Svi korisnici</option>
            </select></label>
        </div>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {fetching ? <p>Učitavam zahteve…</p> : !visible.length ? <p>Nema korisnika za izabranu pretragu.</p> : <div className={styles.grid}>
            {visible.map(item => <article key={item.id} className={styles.card}>
                <span className={styles.badge}>{labels[item.approvalStatus || "legacy"] || "Čeka proveru"}</span>
                <h2>{item.companyName || item.name || "Podaci nisu dopunjeni"}</h2>
                <dl>{[["Kontakt", item.name], ["PIB", item.pib], ["Adresa", item.address], ["Telefon", item.phone], ["Mejl", item.email], ["Registrovan", item.createdDay && new Date(item.createdDay).toLocaleString("sr-Latn-RS")]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Nije uneto"}</dd></div>)}</dl>
                <div className={styles.actions}>
                    {item.approvalStatus !== "approved" && <button disabled={!!busy} onClick={() => setConfirm({ item, status: "approved" })}>Odobri pristup</button>}
                    {item.approvalStatus !== "rejected" && <button className={styles.reject} disabled={!!busy} onClick={() => setConfirm({ item, status: "rejected" })}>{item.approvalStatus === "pending" ? "Odbij zahtev" : "Ukini pristup"}</button>}
                </div>
            </article>)}
        </div>}
        {confirm && <Dialog open onClose={() => { if (!busy) setConfirm(null); }} aria-labelledby="decision-title"><section className={styles.dialog}>
            <h2 id="decision-title">{confirm.status === "approved" ? "Odobri pristup?" : "Odbij pristup?"}</h2>
            <p>{confirm.item.companyName || confirm.item.name} — {confirm.item.email}</p>
            <p>{confirm.status === "approved" ? "Korisnik će moći da vidi cene i šalje porudžbine." : "Korisnik neće moći da vidi cene niti šalje porudžbine."}</p>
            {error && <p role="alert">{error}</p>}
            <div className={styles.actions}><button autoFocus disabled={!!busy} onClick={() => decide(confirm.item, confirm.status)}>{busy ? "Čuvam…" : "Potvrdi"}</button>
            <button className={styles.reject} disabled={!!busy} onClick={() => { setConfirm(null); setError(""); }}>Otkaži</button></div>
        </section></Dialog>}
    </main>;
}
