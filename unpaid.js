import { db, collection, doc, deleteDoc } from "./firebase.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const unpaidList = document.getElementById("unpaidList");

async function loadUnpaid() {
    const snapshot = await getDocs(collection(db, "unpaid"));
    const grouped = {};

    snapshot.forEach(function(document) {
        const item = document.data();
        const key = item.phone || item.name;

        if (!grouped[key]) {
            grouped[key] = {
                name: item.name,
                phone: item.phone,
                total: 0,
                count: 0,
                ids: []
            };
        }

        grouped[key].total += Number(item.amount);
        grouped[key].count++;
        grouped[key].ids.push(document.id);
    });

    unpaidList.innerHTML = "";

    Object.values(grouped).forEach(function(client) {
        unpaidList.innerHTML += `
            <div class="unpaid-card">
                <h2>${client.name}</h2>
                <p>${client.phone || "אין טלפון"}</p>
                <p>מספר פעמים: ${client.count}</p>
                <p>סה״כ לתשלום: ₪${client.total}</p>

                ${client.phone ? `
                    <a class="admin-whatsapp" href="https://wa.me/972${client.phone.substring(1)}" target="_blank">WhatsApp</a>
                    <a class="admin-call" href="tel:${client.phone}">📞</a>
                ` : ""}

                <button onclick='markPaid(${JSON.stringify(client.ids)})'>
                    שולם
                </button>
            </div>
        `;
    });
}

async function markPaid(ids) {
    for (const id of ids) {
        await deleteDoc(doc(db, "unpaid", id));
    }

    loadUnpaid();
}

window.markPaid = markPaid;
loadUnpaid();