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

                <button onclick="changeBooking()">
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
    const confirmCancel = confirm("האם את/ה בטוח/ה שברצונך לבטל את התור?");

    if (!confirmCancel) {
        return;
    }

    const slotId = day.replaceAll(" ", "_").replace("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    alert("התור בוטל בהצלחה");
    findBooking();
}

function changeBooking() {
    location.href = "booking.html";
}

window.findBooking = findBooking;
window.cancelBooking = cancelBooking;
window.changeBooking = changeBooking;