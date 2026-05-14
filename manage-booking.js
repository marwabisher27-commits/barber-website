import { db, collection, doc, deleteDoc } from "./firebase.js";
import {
    getDocs,
    getDoc,
    setDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const phoneInput = document.getElementById("managePhone");
const resultBox = document.getElementById("bookingResult");

async function getCurrentPackageText(booking) {
    if (!booking || (!booking.usedPackage && !booking.package)) {
        return "";
    }

    const typeKey = booking.service.includes("ילדים") ? "_kids" : "_adults";
    const packageRef = doc(db, "packages", booking.phone + typeKey);
    const packageSnap = await getDoc(packageRef);

    if (!packageSnap.exists()) {
        return "";
    }

    const packageData = packageSnap.data();

    return `<p>חבילה: ${packageData.type} | נותרו: ${packageData.remainingCuts}</p>`;
}

async function recalculatePackage(phone, type) {
    let used = 0;

    const appointmentsSnap = await getDocs(collection(db, "appointments"));

    appointmentsSnap.forEach(function(document) {
        const app = document.data();

        if (app.phone === phone) {
            if (type === "מבוגרים" && app.service.includes("מבוגרים")) used++;
            if (type === "ילדים" && app.service.includes("ילדים")) used++;
        }
    });

    const incomeSnap = await getDocs(collection(db, "income"));

    incomeSnap.forEach(function(document) {
        const item = document.data();

        if (item.phone === phone && item.status === "arrived_paid") {
            if (type === "מבוגרים" && item.service.includes("מבוגרים")) used++;
            if (type === "ילדים" && item.service.includes("ילדים")) used++;
        }
    });

    const packageId = type === "מבוגרים" ? phone + "_adults" : phone + "_kids";
    const packageRef = doc(db, "packages", packageId);
    const packageSnap = await getDoc(packageRef);

    if (packageSnap.exists()) {
        const packageData = packageSnap.data();

        await setDoc(packageRef, {
            ...packageData,
            remainingCuts: Math.max(5 - used, 0)
        });
    }
}

function isPastAppointment(day, time) {
    const datePart = day.split(" ")[1];
    if (!datePart) return false;

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

    for (const document of querySnapshot.docs) {
        const booking = document.data();
        const appointmentId = document.id;
        const packageText = await getCurrentPackageText(booking);

        let buttons = "";

        if (isPastAppointment(booking.day, booking.time)) {
            buttons = `
                <p class="no-change">
                    התור עבר ולא ניתן לבטל או לשנות
                </p>
            `;
        } else if (booking.payment === "cash" || booking.payment === "package" || booking.usedPackage || booking.package) {
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
                <p>תשלום: ${booking.payment === "cash" ? "מזומן במספרה" : booking.payment === "package" ? "חבילה" : "אשראי"}</p>
                ${packageText}
                ${buttons}
            </div>
        `;
    }
}

async function cancelBooking(appointmentId, day, time) {
    const confirmCancel = await showConfirmPopup(
        "האם אתה בטוח שברצונך לבטל את התור?"
    );

    if (!confirmCancel) {
        return;
    }

    const appointmentRef = doc(db, "appointments", appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);

    let oldBooking = null;

    if (appointmentSnap.exists()) {
        oldBooking = appointmentSnap.data();
    }

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    if (oldBooking) {
        if (oldBooking.service.includes("מבוגרים")) {
            await recalculatePackage(oldBooking.phone, "מבוגרים");
        }

        if (oldBooking.service.includes("ילדים")) {
            await recalculatePackage(oldBooking.phone, "ילדים");
        }
    }

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