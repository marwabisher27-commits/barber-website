import { db, collection, doc, deleteDoc } from "./firebase.js";
import { getDocs, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const unpaidList = document.getElementById("unpaidList");

async function loadUnpaid() {
    const snapshot = await getDocs(collection(db, "unpaid"));
    unpaidList.innerHTML = "";

    if (snapshot.empty) {
        unpaidList.innerHTML = "<p>אין לקוחות שלא שילמו</p>";
        return;
    }

    snapshot.forEach(function(document) {
        const client = document.data();
        const total = Number(client.totalAmount) || 0;
        const appointments = client.appointments || [];

        let appointmentsHtml = "";

        appointments.forEach(function(app) {
            appointmentsHtml += `
                <div class="unpaid-appointment">
                    <p>שירות: ${app.service || ""}</p>
                    <p>יום: ${app.day || ""}</p>
                    <p>שעה: ${app.time || ""}</p>
                    <p>סכום: ₪${Number(app.amount) || 0}</p>
                </div>
            `;
        });

        unpaidList.innerHTML += `
            <div class="unpaid-card">
                <h2>${client.name || "לקוח"}</h2>
                <p>סה״כ לתשלום: ₪${total}</p>

                ${client.phone ? `
                    <a class="admin-whatsapp" href="https://wa.me/972${client.phone.substring(1)}" target="_blank">WhatsApp</a>
                    <a class="admin-call" href="tel:${client.phone}">📞</a>
                ` : ""}

                <button onclick="editUnpaidPrice('${document.id}', '${client.name || ""}', '${client.phone || ""}', '${total}')">עריכת מחיר</button>
                <button onclick="markPaid('${document.id}')">שולם</button>
                <button onclick="deleteUnpaid('${document.id}')">מחיקה</button>
            </div>
        `;
    });
}

async function openManualUnpaidPopup() {
    const name = prompt("שם הלקוח:");
    if (!name) return;

    const phone = prompt("טלפון:");
    const priceText = prompt("מחיר:");
    const price = Number(priceText);

    if (!price || price <= 0) {
        alert("מחיר לא תקין");
        return;
    }

    await addDoc(collection(db, "unpaid"), {
        name: name,
        phone: phone || "",
        totalAmount: price,
        appointments: [
            {
                service: "הוספה ידנית",
                day: "",
                time: "",
                amount: price
            }
        ],
        createdAt: new Date()
    });

    loadUnpaid();
}

async function editUnpaidPrice(unpaidId, name, phone, oldPrice) {
    const newPriceText = prompt("מחיר חדש:", oldPrice);
    const newPrice = Number(newPriceText);

    if (!newPrice || newPrice <= 0) {
        alert("מחיר לא תקין");
        return;
    }

    await updateDoc(doc(db, "unpaid", unpaidId), {
        totalAmount: newPrice,
        appointments: [
            {
                service: "עודכן ידנית",
                day: "",
                time: "",
                amount: newPrice
            }
        ]
    });

    loadUnpaid();
}

async function markPaid(unpaidId) {
    await deleteDoc(doc(db, "unpaid", unpaidId));
    loadUnpaid();
}

async function deleteUnpaid(unpaidId) {
    const ok = confirm("האם למחוק את הרשומה?");
    if (!ok) return;

    await deleteDoc(doc(db, "unpaid", unpaidId));
    loadUnpaid();
}

window.openManualUnpaidPopup = openManualUnpaidPopup;
window.editUnpaidPrice = editUnpaidPrice;
window.markPaid = markPaid;
window.deleteUnpaid = deleteUnpaid;

loadUnpaid();