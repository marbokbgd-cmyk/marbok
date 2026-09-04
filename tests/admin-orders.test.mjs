// Run: node --experimental-vm-modules --test tests/admin-orders.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import path from 'node:path';

const root = process.cwd();
async function harness(account = { localId: 'owner-id', email: 'nikola.borisavljevic.bgd@gmail.com' }, status = 200) {
    const calls = { lookup: 0, deletion: [], reads: 0 };
    const context = createContext({ AbortSignal, fetch: async (_url, options) => {
        calls.lookup++;
        assert.equal(JSON.parse(options.body).idToken, 'signed-token');
        return { ok: status === 200, status, json: async () => ({ users: account ? [account] : [] }) };
    }});
    const modules = new Map();
    async function load(name) {
        if (modules.has(name)) return modules.get(name);
        let module;
        if (name === '@/server/sanityClient') {
            module = new SyntheticModule(['sanityClient'], function () {
                this.setExport('sanityClient', () => ({
                    delete: async query => { calls.deletion.push(query); },
                    fetch: async () => { calls.reads++; return []; },
                }));
            }, { context });
        } else if (name === '@/sanity/config/client-config') {
            module = new SyntheticModule(['default'], function () { this.setExport('default', {}); }, { context });
        } else {
            const file = name.startsWith('@/') ? name.slice(2) + '.js' : name;
            module = new SourceTextModule(await readFile(path.join(root, file), 'utf8'), { context, identifier: name });
        }
        modules.set(name, module);
        await module.link(load);
        return module;
    }
    const del = await load('pages/api/orders/[id].js'); await del.evaluate();
    const list = await load('pages/api/orders/index.js'); await list.evaluate();
    return { calls, del: del.namespace.default, list: list.namespace.default };
}
function response() {
    return { code: 0, headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(data) { this.data = data; return this; } };
}
function request(method = 'DELETE', id = 'order-123') { return { method, query: { id }, headers: { authorization: 'Bearer signed-token' } }; }

test('missing auth cannot delete or list orders', async () => {
    const h = await harness();
    for (const [method, handler] of [['DELETE', h.del], ['GET', h.list]]) {
        const req = request(method); req.headers = {}; const res = response();
        await handler(req, res); assert.equal(res.code, 401);
    }
    assert.equal(h.calls.lookup, 0); assert.equal(h.calls.deletion.length, 0); assert.equal(h.calls.reads, 0);
});
test('another email, disabled account, and missing account are denied', async () => {
    for (const account of [{ localId: 'other', email: 'buyer@example.com' }, { localId: 'owner', email: 'nikola.borisavljevic.bgd@gmail.com', disabled: true }, null]) {
        const h = await harness(account);
        for (const [method, handler] of [['DELETE', h.del], ['GET', h.list]]) {
            const res = response(); await handler(request(method), res); assert.equal(res.code, 403);
        }
        assert.equal(h.calls.deletion.length, 0); assert.equal(h.calls.reads, 0);
    }
});
test('expired or rejected token fails closed', async () => {
    const h = await harness(null, 400); const res = response(); await h.del(request(), res);
    assert.equal(res.code, 401); assert.equal(h.calls.deletion.length, 0);
});
test('auth service failure never reaches deletion', async () => {
    const h = await harness(null, 503); const res = response(); await h.del(request(), res);
    assert.equal(res.code, 503); assert.equal(h.calls.deletion.length, 0);
});
test('owner deletes only exact order ID via constrained query', async () => {
    const h = await harness(); const res = response(); await h.del(request(), res);
    assert.equal(res.code, 200); assert.equal(res.data.deletedId, 'order-123');
    assert.equal(h.calls.deletion.length, 1);
    assert.equal(h.calls.deletion[0].query, '*[_type == "order" && _id == $id]');
    assert.equal(h.calls.deletion[0].params.id, 'order-123');
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
});
test('invalid IDs and unsupported methods cannot mutate', async () => {
    const h = await harness();
    for (const id of ['*', 'foo" || true', ['one','two'], undefined]) {
        const req = request(); req.query.id = id; const res = response(); await h.del(req, res); assert.equal(res.code, 400);
    }
    const res = response(); await h.del(request('POST'), res); assert.equal(res.code, 405);
    assert.equal(h.calls.deletion.length, 0);
});
test('owner can retrieve fresh order list', async () => {
    const h = await harness(); const res = response(); await h.list(request('GET'), res);
    assert.equal(res.code, 200); assert.equal(h.calls.reads, 1);
});
test('store search handles diacritics, multiple terms, IDs, empty fields and sorting', async () => {
    const source = await readFile(path.join(root, 'utils/storeSearch.js'), 'utf8');
    const { filterStores } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    const stores = [
        { _id: '1', name: 'Žitko', address: 'Đure Jakšića, Čačak', pib: '123456789', pass: '0082' },
        { _id: '2', name: 'Alfa', address: null },
    ];
    assert.equal(filterStores(stores, 'zitko cacak')[0]._id, '1');
    assert.equal(filterStores(stores, 'djure')[0]._id, '1');
    assert.equal(filterStores(stores, '0082', 'pass')[0]._id, '1');
    assert.equal(filterStores(stores, '123456', 'pib')[0]._id, '1');
    assert.equal(filterStores(stores, '123456', 'name').length, 0);
    assert.equal(filterStores(stores, '')[0]._id, '2');
    assert.equal(filterStores(stores, '', 'all', 'desc')[0]._id, '1');
    assert.equal(stores[0]._id, '1');
    assert.deepEqual(filterStores(undefined, ''), []);
});

test('full order export endpoint also requires the owner session', async () => {
    const anonymous = await harness();
    const req = request('GET'); req.headers = {}; const res = response();
    await anonymous.del(req, res); assert.equal(res.code, 401); assert.equal(anonymous.calls.reads, 0);
    const other = await harness({ localId: 'other', email: 'buyer@example.com' });
    const forbidden = response(); await other.del(request('GET'), forbidden);
    assert.equal(forbidden.code, 403); assert.equal(other.calls.reads, 0);
});
