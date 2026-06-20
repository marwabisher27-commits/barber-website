import { db, collection, doc, deleteDoc } from "./firebase.js";
import { getDocs, query, where, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const phoneInput = document.getElementById("managePhone");
const resultBox = document.getElementById("bookingResult");
let foundBookings = {};
function isPastAppointment(day, time) {
    const datePart = day.split(" ")[1];
    const [dayNum, monthNum] = datePart.split("/").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    const appointmentDate = new Date();
    appointmentDate.setMonth(monthNum - 1);
    appointmentDate.setDate(dayNum);
    appointmentDate.setHours(hour, minute, 0, 0);

    return new Date() > appointmentDate;
}

async function findBooking() {
    resultBox.innerHTML = "מחפש...";

    const phone = phoneInput.value.trim();

    const q = query(collection(db, "appointments"), where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        resultBox.innerHTML = "<p>לא נמצא תור למספר זה</p>";
        return;
    }

    resultBox.innerHTML = "";

    querySnapshot.forEach(function(document) {
        const booking = document.data();
        const appointmentId = document.id;
        foundBookings[appointmentId] = booking;
        let buttons = "";

        if (isPastAppointment(booking.day, booking.time)) {
            buttons = `<p class="no-change">התור עבר ולא ניתן לבטל או לשנות</p>`;
        } else {
            buttons = `
                <button onclick="cancelBooking('${appointmentId}')">ביטול תור</button>            
                <button onclick="changeBooking('${appointmentId}', '${booking.day}', '${booking.time}')">שינוי תור</button>
            `;
        }

        resultBox.innerHTML += `
            <div class="found-booking">
                <h3>התור שלך</h3>
                <p>שירות: ${booking.service}</p>
                <p>יום: ${booking.day}</p>
                <p>שעה: ${booking.time}</p>
                ${buttons}
            </div>
        `;
    });
}

async function cancelBooking(appointmentId) {
    const ok = await showConfirmPopup("האם אתה בטוח שברצונך לבטל את התור?");
    if (!ok) return;

    let appointment = foundBookings[appointmentId];

    if (!appointment) {
        const appointmentSnap = await getDoc(doc(db, "appointments", appointmentId));
        appointment = appointmentSnap.exists() ? appointmentSnap.data() : null;
    }

    if (!appointment) {
        showToast("לא נמצא התור");
        return;
    }

    const slotId =
        appointment.day.replaceAll(" ", "_").replaceAll("/", "-") +
        "_" +
        appointment.time.replace(":", "-");

    await addDoc(collection(db, "notifications"), {
        type: "cancel_booking",
        title: "ביטול תור",
        message: `${appointment.name || "לקוח/ה"} ביטל/ה תור ל-${appointment.day} בשעה ${appointment.time}`,
        name: appointment.name || "",
        phone: appointment.phone || "",
        service: appointment.service || "",
        day: appointment.day,
        time: appointment.time,
        seen: false,
        createdAt: new Date()
    });

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    showToast("התור בוטל בהצלחה");
    findBooking();
}

async function changeBooking(appointmentId, day, time) {
    const ok = await showConfirmPopup("כדי לשנות תור, התור הישן יבוטל. להמשיך?");
    if (!ok) return;

    await cancelBooking(appointmentId, day, time);
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