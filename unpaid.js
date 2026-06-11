import { db, collection, doc, deleteDoc } from "./firebase.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

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
                <h2>${client.name}</h2>
                <p>${client.phone || "אין טלפון"}</p>
                <p>מספר פעמים: ${appointments.length}</p>
                <p>סה״כ לתשלום: ₪${total}</p>

                ${appointmentsHtml}

                ${client.phone ? `
                    <a class="admin-whatsapp" href="https://wa.me/972${client.phone.substring(1)}" target="_blank">WhatsApp</a>
                    <a class="admin-call" href="tel:${client.phone}">📞</a>
                ` : ""}

                <button onclick="markPaid('${document.id}')">שולם</button>
            </div>
        `;
    });
}

async function markPaid(unpaidId) {
    await deleteDoc(doc(db, "unpaid", unpaidId));
    loadUnpaid();
}

window.markPaid = markPaid;
loadUnpaid();