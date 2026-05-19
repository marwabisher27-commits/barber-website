import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    setDoc,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCvrOjGFHX-kF6t7tsjWielMQ7UZ8ptXFo",
    authDomain: "barber-website-ece01.firebaseapp.com",
    projectId: "barber-website-ece01",
    storageBucket: "barber-website-ece01.firebasestorage.app",
    messagingSenderId: "90920663626",
    appId: "1:90920663626:web:5be4a5377bc9004b30c4b3"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


export { db, collection, addDoc, doc, getDoc, setDoc, deleteDoc };
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const auth = getAuth(app);

export { db, auth, collection, addDoc, doc, getDoc, setDoc, deleteDoc };