import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import path from 'node:path';
const owner = 'nikola.borisavljevic.bgd@gmail.com';
const newBuyer = { localId: 'new-user', email: 'new@example.com', createdAt: String(Date.parse('2026-09-05')) };
const req = (method = 'GET', body, query = {}) => ({ method, body, query, headers: { authorization: 'Bearer real-token' } });
const res = () => ({ statusCode: 0, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(n) { this.statusCode=n; return this; }, json(v) { this.data=v; return this; }, end() {} });
async function harness({ account = newBuyer, profile = null, identityStatus = 200, profileStatus = profile ? 200 : 404 } = {}) {
    const calls = { firestore: 0, writes: 0, stores: 0, products: 0 };
    const context = createContext({ console, AbortSignal, URL, process: { env: {} }, Buffer,
        fetch: async (url, options) => {
            if (url.includes('identitytoolkit')) return { ok: identityStatus === 200, status: identityStatus, json: async () => ({ users: account ? [account] : [] }) };
            if (options.method === 'PATCH') { calls.writes++; return { ok: true }; }
            calls.firestore++;
            return { ok: profileStatus === 200, status: profileStatus, json: async () => ({ fields: Object.fromEntries(Object.entries(profile || {}).map(([k,v]) => [k, { stringValue: v }])) }) };
        },
    });
    const cache = new Map();
    async function load(name) {
        if (cache.has(name)) return cache.get(name);
        let m;
        if (name === '@/server/sanityClient') m = new SyntheticModule(['sanityClient'], function() { this.setExport('sanityClient', () => ({
            createIfNotExists: async () => { calls.stores++; },
            fetch: async () => { calls.products++; return [{ _id:'p1', productKey:'A1', price:'100', name:'Proizvod' }]; },
            create: async data => { calls.writes++; return data; },
        })); }, { context });
        else if (name === 'node:crypto') m = new SyntheticModule(['randomUUID'], function() { this.setExport('randomUUID', () => 'unique-id'); }, { context });
        else if (name === '@/server/content') m = new SyntheticModule(['getPages','getCategories','getImages','getHeading','getBrandImages','getAboutUs','getOwnerStores'], function() {
            for (const key of ['getPages','getCategories']) this.setExport(key, async withPrices => withPrices ? {name:'Product',price:100} : {name:'Product'});
            for (const key of ['getImages','getHeading','getBrandImages','getAboutUs','getOwnerStores']) this.setExport(key, async () => []);
        }, { context });
        else {
            const file = name.startsWith('@/') ? name.slice(2) + '.js' : name;
            m = new SourceTextModule(readFileSync(path.resolve(file),'utf8'), {context, identifier:name});
        }
        cache.set(name,m); await m.link(load); return m;
    }
    async function module(name) { const m = await load(name); await m.evaluate(); return m.namespace; }
    return { calls, module };
}
test('new users, missing profiles, and fake profile dates do not receive access', async () => {
    for (const profile of [null, { approvalStatus:'pending' }, { createdDay:'2000-01-01', roles:'admin' }]) {
        const h = await harness({profile}); const api = await h.module('pages/api/account/index.js'); const r=res();
        await api.default(req(),r); assert.equal(r.statusCode,200); assert.equal(r.data.status,'pending');
    }
});
test('existing users retain access using Firebase creation time; rejection overrides it', async () => {
    for (const [profile, expected] of [[null,'approved'],[{approvalStatus:'rejected'},'rejected']]) {
        const h=await harness({ account:{...newBuyer,createdAt:String(Date.parse('2026-09-01'))},profile });
        const api=await h.module('pages/api/account/index.js'); const r=res(); await api.default(req(),r); assert.equal(r.data.status,expected);
    }
});
test('new approved user receives access and owner remains accessible without a profile', async () => {
    for (const options of [{ profile:{approvalStatus:'approved'} },{account:{...newBuyer,email:owner}}]) {
        const h=await harness(options); const api=await h.module('pages/api/account/index.js');const r=res();await api.default(req(),r);assert.equal(r.data.status,'approved');
    }
});
test('invalid, disabled, missing auth, and service failure all fail closed', async () => {
    for(const options of [{identityStatus:400},{identityStatus:503},{account:{...newBuyer,disabled:true}},{profileStatus:403},{account:null}]) {
        const h=await harness(options);const api=await h.module('pages/api/account/index.js');const r=res();await api.default(req(),r);assert.ok(r.statusCode>=400);assert.equal(r.data.status,undefined);
    }
    const h=await harness();const api=await h.module('pages/api/account/index.js');const r=res();const q=req();q.headers={};await api.default(q,r);assert.equal(r.statusCode,401);
});
test('pending accounts receive public catalog without prices and cannot read stores', async () => {
    const h=await harness();const api=await h.module('pages/api/content.js');
    for(const kind of ['pages','categories']) { const r=res();await api.default(req('GET',null,{kind}),r);assert.equal(r.data.data.price,undefined);assert.equal(r.headers['Cache-Control'],'private, no-store'); }
    const r=res();await api.default(req('GET',null,{kind:'stores'}),r);assert.equal(r.statusCode,403);
});
test('prices removed recursively from all SSR catalog shapes', async () => {
    const h=await harness();const {withoutPrices}=await h.module('@/utils/accountAccess');
    const result=withoutPrices({price:2,content:[{contentArea:[{price:100,name:'One'}]}],categoryProducts:[{price:3}],totalPrice:'20'});
    assert.equal(JSON.stringify(result).includes('price'),false);assert.equal(result.content[0].contentArea[0].name,'One');
});
test('buyer cannot self-approve even with owner email in request body', async () => {
    const h=await harness();const api=await h.module('pages/api/users/[uid].js');const r=res();
    await api.default(req('PATCH',{status:'approved',email:owner},{uid:'new-user'}),r);assert.equal(r.statusCode,403);assert.equal(h.calls.writes,0);assert.equal(h.calls.stores,0);
});
test('owner approval requires complete business details; rejection is still possible', async () => {
    const h=await harness({account:{...newBuyer,email:owner,localId:'owner'},profile:{approvalStatus:'pending'}});const api=await h.module('pages/api/users/[uid].js');
    const r=res();await api.default(req('PATCH',{status:'approved'},{uid:'new-user'}),r);assert.equal(r.statusCode,400);assert.equal(h.calls.writes,0);
    const rejected=res();await api.default(req('PATCH',{status:'rejected'},{uid:'new-user'}),rejected);assert.equal(rejected.statusCode,200);assert.equal(h.calls.writes,1);
});
test('owner can approve a complete application; creates store idempotently', async () => {
    const h=await harness({account:{...newBuyer,email:owner,localId:'owner'},profile:{name:'Buyer',companyName:'Store',pib:'123456789',address:'Street',phone:'12345',email:'new@example.com'}});
    const api=await h.module('pages/api/users/[uid].js');const r=res();await api.default(req('PATCH',{status:'approved'},{uid:'new-user'}),r);assert.equal(r.statusCode,200);assert.equal(h.calls.stores,1);assert.equal(h.calls.writes,1);
});
test('pending buyer cannot submit an order, including a valid old cart', async () => {
    const h=await harness();const api=await h.module('pages/api/orders/create.js');const r=res();await api.default(req('POST',{items:[{productId:'p1',quantity:1}]}),r);assert.equal(r.statusCode,403);assert.equal(h.calls.products,0);assert.equal(h.calls.writes,0);
});
test('approved buyer order uses server price, quantity and trusted UID', async () => {
    const h=await harness({profile:{approvalStatus:'approved'}});const api=await h.module('pages/api/orders/create.js');const r=res();
    await api.default(req('POST',{firstName:'Buyer',email:'new@example.com',phone:'123',customerUid:'owner',items:[{productId:'p1',quantity:3,price:1}]}),r);
    assert.equal(r.statusCode,201);assert.equal(r.data.order.items[0].price,'100');assert.equal(r.data.order.totalPrice,'300 rsd');assert.equal(r.data.order.customerUid,'new-user');
});
test('direct order links are gated before querying order data', async () => {
    const h=await harness();const api=await h.module('pages/api/orders/detail.js');const r=res();await api.default(req('GET',null,{orderNumber:'ORD-123'}),r);assert.equal(r.statusCode,403);assert.equal(h.calls.products,0);
});
