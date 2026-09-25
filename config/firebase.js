import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBENphRgnWzts9qt_0RsG5G7bo5UDO7NeA",
    authDomain: "marbok-3a9e2.firebaseapp.com",
    projectId: "marbok-3a9e2",
    storageBucket: "marbok-3a9e2.firebasestorage.app",
    messagingSenderId: "238540981156",
    appId: "1:238540981156:web:1e7c5100f0e3f6a1833731",
    measurementId: "G-VC3C2KHJKG",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
