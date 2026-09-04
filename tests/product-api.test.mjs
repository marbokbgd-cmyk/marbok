import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SourceTextModule, SyntheticModule, createContext } from "node:vm";

function response() {
    return {
        code: 0,
        headers: {},
        setHeader(key, value) { this.headers[key] = value; },
        status(code) { this.code = code; return this; },
        json(data) { this.data = data; return this; },
    };
}

async function harness(owner = true) {
    const calls = { list: 0, save: [], delete: [], prepare: 0, apply: 0 };
    const context = createContext({ console });
    const auth = new SyntheticModule(["requireOwner"], function () {
        this.setExport("requireOwner", async (_req, res) => {
            if (!owner) res.status(403).json({ error: "forbidden" });
            return owner;
        });
    }, { context });
    const service = new SyntheticModule([
        "ProductError", "cleanProductInput", "deleteProduct", "getManagedCatalog", "saveProduct", "applyImport", "prepareImport",
    ], function () {
        this.setExport("ProductError", class ProductError extends Error {});
        this.setExport("cleanProductInput", body => body);
        this.setExport("deleteProduct", async id => { calls.delete.push(id); });
        this.setExport("getManagedCatalog", async () => { calls.list++; return { categories: [], products: [] }; });
        this.setExport("saveProduct", async (body, id) => { calls.save.push({ body, id }); return id || "new-id"; });
        this.setExport("prepareImport", async rows => { calls.prepare++; return rows.map((_, index) => ({ row: index + 2, errors: [] })); });
        this.setExport("applyImport", async rows => { calls.apply++; return { count: rows.length }; });
    }, { context });
    async function load(path) {
        const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
        const module = new SourceTextModule(source, { context, identifier: path });
        await module.link(name => name === "@/server/requireOwner" ? auth : service);
        await module.evaluate();
        return module.namespace.default;
    }
    return { calls, products: await load("pages/api/products/index.js"), imports: await load("pages/api/products/import.js") };
}

test("product management APIs reject non-owner sessions before touching Sanity", async () => {
    const h = await harness(false);
    for (const [handler, req] of [
        [h.products, { method: "GET", headers: {} }],
        [h.products, { method: "DELETE", body: { id: "p1" }, headers: {} }],
        [h.imports, { method: "POST", body: { rows: [{}] }, headers: {} }],
    ]) {
        const res = response(); await handler(req, res); assert.equal(res.code, 403);
    }
    assert.deepEqual(h.calls, { list: 0, save: [], delete: [], prepare: 0, apply: 0 });
});

test("owner CRUD requests use the constrained product service", async () => {
    const h = await harness(true);
    const list = response(); await h.products({ method: "GET", headers: {} }, list); assert.equal(list.code, 200);
    const add = response(); await h.products({ method: "POST", body: { productKey: "A1" }, headers: {} }, add); assert.equal(add.code, 201);
    const edit = response(); await h.products({ method: "PATCH", body: { id: "p1", productKey: "A1" }, headers: {} }, edit); assert.equal(edit.code, 200);
    const remove = response(); await h.products({ method: "DELETE", body: { id: "p1" }, headers: {} }, remove); assert.equal(remove.code, 200);
    assert.equal(h.calls.list, 1); assert.deepEqual(h.calls.save.map(call => call.id), [null, "p1"]); assert.deepEqual(h.calls.delete, ["p1"]);
});

test("Excel import separates preview from explicit confirmation", async () => {
    const h = await harness(true);
    const preview = response(); await h.imports({ method: "POST", body: { rows: [{ productKey: "A1" }], apply: false }, headers: {} }, preview);
    assert.equal(preview.code, 200); assert.equal(h.calls.prepare, 1); assert.equal(h.calls.apply, 0);
    const apply = response(); await h.imports({ method: "POST", body: { rows: [{ productKey: "A1" }], apply: true }, headers: {} }, apply);
    assert.equal(apply.code, 200); assert.equal(h.calls.apply, 1);
});

