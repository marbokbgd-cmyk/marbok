// Start the Firestore emulator with firestore.rules, then run this file.
// Uses only an isolated demo project, never production credentials or data.
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, collection } from 'firebase/firestore';
const apps=[];
function client(uid, email) {
    const app=initializeApp({projectId:'demo-marbok-approval',apiKey:'demo-key'}, uid || 'guest');apps.push(app);
    const db=getFirestore(app);
    connectFirestoreEmulator(db,'127.0.0.1',8080, uid ? {mockUserToken:{sub:uid,email}} : {});
    return db;
}
const uid='new-buyer';
const buyer=client(uid,'buyer@example.com'), other=client('other-buyer','other@example.com'), owner=client('owner','nikola.borisavljevic.bgd@gmail.com'), guest=client();
const profile={uid,email:'buyer@example.com',name:'Kupac',companyName:'Radnja',pib:'123456789',address:'Adresa 1',phone:'060123456',roles:['user'],createdDay:new Date().toISOString(),approvalStatus:'pending'};
let checks=0;
async function allowed(action) { await action; checks++; }
async function denied(action) { await assert.rejects(action, error => error.code === 'permission-denied');checks++; }
try {
    await denied(setDoc(doc(buyer,'users',uid),{...profile,approvalStatus:'approved'}));
    await denied(setDoc(doc(buyer,'users',uid),{...profile,roles:['admin']}));
    await denied(setDoc(doc(buyer,'users',uid),{...profile,email:'nikola.borisavljevic.bgd@gmail.com'}));
    await allowed(setDoc(doc(buyer,'users',uid),profile));
    await allowed(getDoc(doc(buyer,'users',uid)));
    await denied(getDoc(doc(other,'users',uid)));
    await denied(getDoc(doc(guest,'users',uid)));
    await denied(getDocs(collection(buyer,'users')));
    await denied(updateDoc(doc(buyer,'users',uid),{approvalStatus:'approved'}));
    await denied(updateDoc(doc(buyer,'users',uid),{roles:['admin']}));
    await denied(updateDoc(doc(buyer,'users',uid),{createdDay:'2000-01-01'}));
    await denied(deleteDoc(doc(buyer,'users',uid)));
    await allowed(updateDoc(doc(buyer,'users',uid),{phone:'060111111'}));
    await allowed(getDocs(collection(owner,'users')));
    await allowed(updateDoc(doc(owner,'users',uid),{approvalStatus:'approved',reviewedAt:new Date().toISOString(),reviewedBy:'owner'}));
    assert.equal((await getDoc(doc(buyer,'users',uid))).data().approvalStatus,'approved');checks++;
    await allowed(updateDoc(doc(buyer,'users',uid),{address:'Nova adresa 2'}));
    await denied(updateDoc(doc(buyer,'users',uid),{approvalStatus:'pending'}));
    await allowed(updateDoc(doc(owner,'users',uid),{approvalStatus:'rejected'}));
    await denied(updateDoc(doc(buyer,'users',uid),{approvalStatus:'approved'}));
    await denied(setDoc(doc(buyer,'otherCollection','test'),{approved:true}));
    console.log(`${checks} Firestore security rule checks passed in demo-marbok-approval.`);
} finally { await Promise.all(apps.map(deleteApp)); }
