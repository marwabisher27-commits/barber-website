import { db, collection } from "./firebase.js";
import { getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const phoneInput = document.getElementById("managePhone");
const resultBox = document.getElementById("bookingResult");

async function findBooking() {
    resultBox.innerHTML = "מחפש...";

    const phone = phoneInput.value;

    const q = query(
        collection(db, "appointments"),
        where("phone", "==", phone)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        resultBox.innerHTML = "<p>לא נמצא תור למספר זה</p>";
        return;
    }

    querySnapshot.forEach(function(doc) {
        const booking = doc.data();

        resultBox.innerHTML = `
            <div class="found-booking">
                <h3>התור שלך</h3>
                <p>שירות: ${booking.service}</p>
                <p>יום: ${booking.day}</p>
                <p>שעה: ${booking.time}</p>
                <p>תשלום: ${booking.payment}</p>
            </div>
        `;
    });
}

window.findBooking = findBooking;