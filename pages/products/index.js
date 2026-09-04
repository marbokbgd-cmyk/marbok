import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { MdAdd, MdDelete, MdEdit, MdFileDownload, MdUploadFile } from "react-icons/md";
import { auth } from "@/config/firebase";
import { useAuth } from "@/hooks/useAuth";
import { isOwner } from "@/utils/adminAccess";
import { indexGroups, normalizeLookup } from "@/utils/productManagement";
import styles from "./Products.module.css";

const emptyForm = { id: "", name: "", productKey: "", price: "", package: "", categoryId: "", groupId: "", image: null };

async function ownerRequest(path, options = {}) {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(path, {
        ...options,
        cache: "no-store",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Zahtev nije uspeo.");
    return data;
}

async function imagePayload(file) {
    if (!file) return null;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Slika mora biti JPG, PNG ili WebP.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Slika može imati najviše 5 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 32768)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
    return { name: file.name, dataUrl: `data:${file.type};base64,${btoa(binary)}` };
}

export default function ProductManagement() {
    const { user, loading } = useAuth();
    const [catalog, setCatalog] = useState({ categories: [], products: [] });
    const [fetching, setFetching] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [imageFilter, setImageFilter] = useState("all");
    const [form, setForm] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [importRows, setImportRows] = useState(null);
    const [importPlan, setImportPlan] = useState(null);

    const loadCatalog = useCallback(async () => {
        if (!isOwner(auth.currentUser)) return;
        setFetching(true);
        try {
            setCatalog(await ownerRequest("/api/products"));
            setError("");
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setFetching(false);
        }
    }, []);

    useEffect(() => {
        if (isOwner(user)) loadCatalog();
        else setFetching(false);
    }, [user, loadCatalog]);

    const groups = useMemo(() => indexGroups(catalog.categories), [catalog.categories]);
    const groupById = useMemo(() => new Map(groups.map(group => [group.id, group])), [groups]);
    const visible = useMemo(() => {
        const needle = normalizeLookup(search);
        return catalog.products.filter(product => {
            const group = groupById.get(product.groupId);
            return (!needle || normalizeLookup(`${product.name} ${product.productKey} ${product.package}`).includes(needle))
                && (categoryFilter === "all" || group?.categoryId === categoryFilter)
                && (imageFilter === "all" || (imageFilter === "missing" ? !product.imageUrl : !!product.imageUrl));
        });
    }, [catalog.products, groupById, search, categoryFilter, imageFilter]);

    function openNew() {
        const category = catalog.categories[0];
        setForm({ ...emptyForm, categoryId: category?.id || "", groupId: category?.groups?.[0]?.id || "" });
        setMessage(""); setError("");
    }

    function openEdit(product) {
        const group = groupById.get(product.groupId);
        setForm({ ...emptyForm, ...product, categoryId: group?.categoryId || "", image: null });
        setMessage(""); setError("");
    }

    async function save(event) {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setError("");
        try {
            const payload = { ...form, image: await imagePayload(form.image) };
            await ownerRequest("/api/products", {
                method: form.id ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            setForm(null);
            setMessage(form.id ? "Proizvod je izmenjen." : "Proizvod je dodat u Sanity bazu.");
            await loadCatalog();
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setBusy(false);
        }
    }

    async function remove() {
        if (!deleteTarget || busy) return;
        setBusy(true); setError("");
        try {
            await ownerRequest("/api/products", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: deleteTarget.id }),
            });
            setDeleteTarget(null);
            setMessage("Proizvod je obrisan iz Sanity baze.");
            await loadCatalog();
        } catch (removeError) {
            setError(removeError.message);
        } finally {
            setBusy(false);
        }
    }

    async function chooseExcel(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setBusy(true); setError(""); setMessage("");
        try {
            const { readProductWorkbook } = await import("@/utils/productWorkbook");
            const rows = await readProductWorkbook(file);
            const result = await ownerRequest("/api/products/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rows, apply: false }),
            });
            setImportRows(rows); setImportPlan(result.plan);
        } catch (importError) {
            setError(importError.message);
        } finally {
            setBusy(false);
        }
    }

    async function applyExcel() {
        if (!importRows || busy || importPlan?.some(item => item.errors.length)) return;
        setBusy(true); setError("");
        try {
            const result = await ownerRequest("/api/products/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rows: importRows, apply: true }),
            });
            setImportRows(null); setImportPlan(null);
            setMessage(`Excel uvoz je završen: ${result.count} promena u Sanity bazi.`);
            await loadCatalog();
        } catch (importError) {
            setError(importError.message);
        } finally {
            setBusy(false);
        }
    }

    async function downloadTemplate() {
        setBusy(true); setError("");
        try {
            const { downloadProductTemplate } = await import("@/utils/productWorkbook");
            await downloadProductTemplate(catalog.categories);
        } catch (templateError) {
            setError(templateError.message || "Šablon nije napravljen.");
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <main className={styles.container}>Proveravamo pristup…</main>;
    if (!isOwner(user)) return <main className={styles.container}><p>Ova stranica je dostupna samo vlasniku.</p><Link href="/">Nazad na sajt</Link></main>;

    const selectedCategory = catalog.categories.find(category => category.id === form?.categoryId);
    const invalidImport = importPlan?.some(item => item.errors.length);
    return <main className={styles.container}>
        <header className={styles.top}>
            <div><Link href="/" className={styles.back}>← Nazad na sajt</Link><h1>Proizvodi</h1><p>Dodavanje i izmena proizvoda direktno u Sanity bazi.</p></div>
            <button className={styles.primary} onClick={openNew}><MdAdd /> Dodaj proizvod</button>
        </header>

        <section className={styles.excelPanel}>
            <div><h2>Masovni unos preko Excela</h2><p>Pre potvrde ćeš videti svaku stavku koja se dodaje, menja ili briše.</p></div>
            <div className={styles.actions}>
                <button disabled={busy || fetching} onClick={downloadTemplate}><MdFileDownload /> Preuzmi šablon</button>
                <label className={styles.fileButton}><MdUploadFile /> Učitaj popunjen Excel<input type="file" accept=".xlsx" onChange={chooseExcel} disabled={busy} /></label>
            </div>
        </section>

        <section className={styles.filters}>
            <label>Pretraga<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Naziv, šifra ili pakovanje…" /></label>
            <label>Kategorija<select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">Sve kategorije</option>{catalog.categories.map(category => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
            <label>Slike<select value={imageFilter} onChange={event => setImageFilter(event.target.value)}><option value="all">Svi proizvodi</option><option value="missing">Bez slike</option><option value="with">Sa slikom</option></select></label>
        </section>

        {message && <p className={styles.success} role="status">{message}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.count}>{fetching ? "Učitavam…" : `${visible.length} od ${catalog.products.length} proizvoda`}</div>
        <section className={styles.grid}>
            {visible.map(product => {
                const group = groupById.get(product.groupId);
                return <article className={styles.card} key={product.id}>
                    <div className={styles.imageBox}>{product.imageUrl ? <Image src={product.imageUrl} alt={product.name || "Proizvod"} width={180} height={150} className={styles.image} unoptimized /> : <span>Bez slike</span>}</div>
                    <div className={styles.cardBody}><span className={styles.path}>{group ? `${group.categoryTitle} · ${group.title}` : "Nije povezan sa sekcijom"}</span><h2>{product.name || "Bez naziva"}</h2><p>Šifra: <strong>{product.productKey || "—"}</strong></p><p>{product.package || "Pakovanje nije uneto"}</p><p className={styles.price}>{product.price || "0"} RSD</p></div>
                    <div className={styles.cardActions}><button onClick={() => openEdit(product)}><MdEdit /> Izmeni</button><button className={styles.delete} onClick={() => { setDeleteTarget(product); setError(""); }}><MdDelete /> Obriši</button></div>
                </article>;
            })}
        </section>

        <Dialog open={!!form} onClose={() => !busy && setForm(null)} fullWidth maxWidth="sm">
            <form onSubmit={save}>
                <DialogTitle>{form?.id ? "Izmeni proizvod" : "Dodaj proizvod"}</DialogTitle>
                <DialogContent className={styles.form}>
                    {form?.imageUrl && <Image src={form.imageUrl} alt="Trenutna slika" width={120} height={100} className={styles.formImage} unoptimized />}
                    <label>Naziv<input required maxLength="200" value={form?.name || ""} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></label>
                    <label>Šifra<input required maxLength="100" value={form?.productKey || ""} onChange={event => setForm(current => ({ ...current, productKey: event.target.value }))} /></label>
                    <label>Cena u RSD<input required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" value={form?.price || ""} onChange={event => setForm(current => ({ ...current, price: event.target.value }))} /></label>
                    <label>Pakovanje<input maxLength="100" value={form?.package || ""} onChange={event => setForm(current => ({ ...current, package: event.target.value }))} /></label>
                    <label>Kategorija<select required value={form?.categoryId || ""} onChange={event => { const category = catalog.categories.find(item => item.id === event.target.value); setForm(current => ({ ...current, categoryId: event.target.value, groupId: category?.groups?.[0]?.id || "" })); }}><option value="">Izaberi kategoriju</option>{catalog.categories.map(category => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>
                    <label>Sekcija<select required value={form?.groupId || ""} onChange={event => setForm(current => ({ ...current, groupId: event.target.value }))}><option value="">Izaberi sekciju</option>{(selectedCategory?.groups || []).map(group => <option key={group.id} value={group.id}>{group.title}</option>)}</select></label>
                    <label>Slika proizvoda<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setForm(current => ({ ...current, image: event.target.files?.[0] || null }))} /><small>{form?.id ? "Ostavi prazno ako ne menjaš sliku. JPG, PNG ili WebP do 5 MB." : "JPG, PNG ili WebP do 5 MB."}</small></label>
                    {error && <p className={styles.error} role="alert">{error}</p>}
                </DialogContent>
                <DialogActions className={styles.dialogActions}><button type="button" disabled={busy} onClick={() => setForm(null)}>Otkaži</button><button className={styles.primary} disabled={busy}>{busy ? "Čuvam…" : "Sačuvaj u Sanity"}</button></DialogActions>
            </form>
        </Dialog>

        <Dialog open={!!deleteTarget} onClose={() => !busy && setDeleteTarget(null)} fullWidth maxWidth="xs">
            <DialogTitle>Obriši proizvod?</DialogTitle><DialogContent><p><strong>{deleteTarget?.name}</strong> ({deleteTarget?.productKey}) biće uklonjen iz Sanity baze i kataloga.</p>{error && <p className={styles.error}>{error}</p>}</DialogContent>
            <DialogActions className={styles.dialogActions}><button disabled={busy} onClick={() => setDeleteTarget(null)}>Otkaži</button><button className={styles.danger} disabled={busy} onClick={remove}>{busy ? "Brišem…" : "Obriši"}</button></DialogActions>
        </Dialog>

        <Dialog open={!!importPlan} onClose={() => !busy && setImportPlan(null)} fullWidth maxWidth="lg">
            <DialogTitle>Pregled Excel uvoza</DialogTitle><DialogContent><p>{invalidImport ? "Uvoz nije moguć dok se ne isprave označeni redovi." : `${importPlan?.length || 0} promena je spremno. Podaci još nisu upisani.`}</p>
                <div className={styles.tableWrap}><table><thead><tr><th>Red</th><th>Promena</th><th>Šifra</th><th>Naziv</th><th>Kategorija / sekcija</th><th>Status</th></tr></thead><tbody>{importPlan?.map(item => <tr key={item.row} className={item.errors.length ? styles.badRow : ""}><td>{item.row}</td><td>{item.operation === "delete" ? "Brisanje" : item.existingId ? "Izmena" : "Dodavanje"}</td><td>{item.productKey || item.product?.productKey}</td><td>{item.product?.name || "—"}</td><td>{item.product ? `${item.categoryTitle} / ${item.groupTitle}` : "—"}</td><td>{item.errors.length ? item.errors.join(" ") : "Spremno"}</td></tr>)}</tbody></table></div>
                {error && <p className={styles.error}>{error}</p>}
            </DialogContent><DialogActions className={styles.dialogActions}><button disabled={busy} onClick={() => { setImportPlan(null); setImportRows(null); }}>Otkaži</button><button className={styles.primary} disabled={busy || invalidImport} onClick={applyExcel}>{busy ? "Upisujem…" : "Potvrdi upis u Sanity"}</button></DialogActions>
        </Dialog>
    </main>;
}
