import { db, collection, doc, deleteDoc } from "./firebase.js";
import {
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const phoneInput = document.getElementById("managePhone");
const resultBox = document.getElementById("bookingResult");

async function findBooking() {
    resultBox.innerHTML = "מחפש...";

    const phone = phoneInput.value.trim();

    const q = query(
        collection(db, "appointments"),
        where("phone", "==", phone)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        resultBox.innerHTML = "<p>לא נמצא תור למספר זה</p>";
        return;
    }

    resultBox.innerHTML = "";

    querySnapshot.forEach(function(document) {
        const booking = document.data();
        const appointmentId = document.id;

        let buttons = "";

        if (booking.payment === "cash") {
            buttons = `
                <button onclick="cancelBooking('${appointmentId}', '${booking.day}', '${booking.time}')">
                    ביטול תור
                </button>

                <button onclick="changeBooking('${appointmentId}', '${booking.day}', '${booking.time}')">
                    שינוי תור
                </button>
            `;
        } else {
            buttons = `
                <p class="no-change">
                    תור ששולם באשראי לא ניתן לביטול או שינוי דרך האתר
                </p>
            `;
        }

        resultBox.innerHTML += `
            <div class="found-booking">
                <h3>התור שלך</h3>
                <p>שירות: ${booking.service}</p>
                <p>יום: ${booking.day}</p>
                <p>שעה: ${booking.time}</p>
                <p>תשלום: ${booking.payment === "cash" ? "מזומן במספרה" : "אשראי"}</p>
                ${buttons}
            </div>
        `;
    });
}

async function cancelBooking(appointmentId, day, time) {
    const confirmCancel = await showConfirmPopup(
    "האם אתה בטוח שברצונך לבטל את התור?"
);

    if (!confirmCancel) {
        return;
    }

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    showToast("התור בוטל בהצלחה");
    findBooking();
}

async function changeBooking(appointmentId, day, time) {
    const confirmChange = await showConfirmPopup(
    "כדי לשנות תור, התור הישן יבוטל. להמשיך?"
);

    if (!confirmChange) {
        return;
    }

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");
    await deleteDoc(doc(db, "appointments", appointmentId));
await deleteDoc(doc(db, "bookedSlots", slotId));

showToast("התור בוטל בהצלחה");
findBooking();

    location.href = "booking.html";
}
function showConfirmPopup(message) {
    return new Promise((resolve) => {

        const popup = document.createElement("div");
        popup.className = "confirm-popup";

        popup.innerHTML = `
            <div class="confirm-card">
                <p>${message}</p>

                <div class="confirm-buttons">
                    <button class="yes-btn">אישור</button>
                    <button class="no-btn">ביטול</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        popup.querySelector(".yes-btn").onclick = () => {
            popup.remove();
            resolve(true);
        };

        popup.querySelector(".no-btn").onclick = () => {
            popup.remove();
            resolve(false);
        };
    });
}
function showToast(text) {
    const message = document.createElement("div");
    message.className = "toast-message";
    message.textContent = text;
    document.body.appendChild(message);

    setTimeout(function() {
        message.remove();
    }, 1800);
}
window.findBooking = findBooking;
window.cancelBooking = cancelBooking;
window.changeBooking = changeBooking;