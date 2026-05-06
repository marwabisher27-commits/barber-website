import { db, collection, doc, deleteDoc } from "./firebase.js";
import {
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const appointmentsList = document.getElementById("appointmentsList");
const ordersList = document.getElementById("ordersList");

async function loadAppointments() {
    const snapshot = await getDocs(collection(db, "appointments"));

    appointmentsList.innerHTML = "";

    snapshot.forEach(function(document) {
        const app = document.data();
        const id = document.id;

        appointmentsList.innerHTML += `
            <div class="admin-card">
                <p><strong>שם:</strong> ${app.name}</p>
                <p><strong>טלפון:</strong> ${app.phone}</p>
                <p><strong>שירות:</strong> ${app.service}</p>
                <p><strong>יום:</strong> ${app.day}</p>
                <p><strong>שעה:</strong> ${app.time}</p>
                <p><strong>תשלום:</strong> ${app.payment}</p>
                <p><strong>סטטוס:</strong> ${app.status || "ממתין לאישור"}</p>

                <button onclick="approveAppointment('${id}')">אישור תור</button>
                <button onclick="rejectAppointment('${id}')">דחיית תור</button>
                <button onclick="deleteAppointment('${id}')">מחיקת תור</button>
            </div>
        `;
    });
}

async function approveAppointment(id) {
    await updateDoc(doc(db, "appointments", id), {
        status: "אושר"
    });

    loadAppointments();
}

async function rejectAppointment(id) {
    await updateDoc(doc(db, "appointments", id), {
        status: "נדחה"
    });

    loadAppointments();
}

async function deleteAppointment(id) {
    await deleteDoc(doc(db, "appointments", id));
    loadAppointments();
}

async function loadOrders() {
    const snapshot = await getDocs(collection(db, "orders"));

    ordersList.innerHTML = "";

    snapshot.forEach(function(document) {
        const order = document.data();

        ordersList.innerHTML += `
            <div class="admin-card">
                <p><strong>שם:</strong> ${order.name}</p>
                <p><strong>טלפון:</strong> ${order.phone}</p>
                <p><strong>כתובת:</strong> ${order.address}</p>
                <p><strong>סה״כ:</strong> ${order.total}</p>
            </div>
        `;
    });
}

loadAppointments();
loadOrders();

window.approveAppointment = approveAppointment;
window.rejectAppointment = rejectAppointment;
window.deleteAppointment = deleteAppointment;