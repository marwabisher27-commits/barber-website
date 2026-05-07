import { db, collection, doc, deleteDoc } from "./firebase.js";
import { getDocs, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
const workingHours = {
    "ראשון": ["14:00", "23:00"],
    "שני": ["14:00", "23:00"],
    "שלישי": ["14:00", "23:00"],
    "רביעי": null,
    "חמישי": ["14:00", "23:00"],
    "שישי": ["14:00", "23:00"],
    "שבת": ["10:00", "23:00"]
};

const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
let allAppointments = [];
async function getCurrentPackageText(appointment) {
    if (!appointment.usedPackage && !appointment.package) {
        return "";
    }

    const typeKey =
        appointment.service.includes("ילדים") ? "_kids" : "_adults";

    const packageRef = doc(db, "packages", appointment.phone + typeKey);
    const packageSnap = await getDoc(packageRef);

    if (!packageSnap.exists()) {
        return "";
    }

    const packageData = packageSnap.data();

    return `<p>חבילה: ${packageData.type} | נותרו: ${packageData.remainingCuts}</p>`;
}
async function loadAppointments() {
    const snapshot = await getDocs(collection(db, "appointments"));
    allAppointments = [];

    snapshot.forEach(function(document) {
        allAppointments.push({
            id: document.id,
            ...document.data()
        });
    });

    showFullWeek();
}

function showFullWeek() {
    scheduleBox.innerHTML = "";

    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);

        const dayName = dayNames[date.getDay()];
        const dateText =
            String(date.getDate()).padStart(2, "0") +
            "/" +
            String(date.getMonth() + 1).padStart(2, "0");

        const fullDay = dayName + " " + dateText;

        const dayBox = document.createElement("div");
        dayBox.className = "admin-day-box";

        dayBox.innerHTML = `<h2>${fullDay}</h2>`;

        if (workingHours[dayName] === null) {
            dayBox.innerHTML += `
                <div class="admin-closed-day">
                    🔒 המספרה סגורה ביום זה
                </div>
            `;
        } else {
            const times = createTimes(workingHours[dayName][0], workingHours[dayName][1]);

            for (const time of times) {
                const appointment = allAppointments.find(function(app) {
                    return app.day === fullDay && app.time === time;
                });
const packageText = await getCurrentPackageText(appointment);
                const slot = document.createElement("div");
                slot.className = "admin-slot";

                if (appointment) {
                    slot.classList.add("busy");
                    slot.innerHTML = `
                        <strong>${time}</strong>
                        <p>${appointment.name}</p>
                        <p>${appointment.phone}</p>
                        <p>${appointment.service}</p>
                        <p>${appointment.payment === "cash" ? "מזומן במספרה" : "אשראי"}</p>
                           ${packageText}
                        <button onclick="adminCancelBooking('${appointment.id}', '${appointment.day}', '${appointment.time}')">
                            ביטול תור
                        </button>

                        <a class="admin-whatsapp"
                           href="https://wa.me/972${appointment.phone.substring(1)}"
                           target="_blank">
                            WhatsApp
                        </a>
                    `;
                } else {
                    slot.innerHTML = `
                        <strong>${time}</strong>
                        <p>פנוי</p>
                    `;
                }

                dayBox.appendChild(slot);
            };
        }

        scheduleBox.appendChild(dayBox);
    }
}

function createTimes(start, end) {
    const result = [];
    let [startHour, startMinute] = start.split(":").map(Number);
    let [endHour, endMinute] = end.split(":").map(Number);

    let current = startHour * 60 + startMinute;
    let finish = endHour * 60 + endMinute;

    while (current <= finish) {
        let hour = Math.floor(current / 60);
        let minute = current % 60;

        result.push(
            String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0")
        );

        current += 30;
    }

    return result;
}

async function adminCancelBooking(appointmentId, day, time) {
    const ok = await showAdminConfirm("לבטל את התור הזה?");
    if (!ok) return;

    const appointmentRef = doc(db, "appointments", appointmentId);
    const appointmentSnap = await getDoc(appointmentRef);

    if (appointmentSnap.exists()) {
        const appointment = appointmentSnap.data();

        if (appointment.usedPackage) {
            const packageId =
                appointment.usedPackage.type === "מבוגרים"
                    ? appointment.phone + "_adults"
                    : appointment.phone + "_kids";

            const packageRef = doc(db, "packages", packageId);
            const packageSnap = await getDoc(packageRef);

            if (packageSnap.exists()) {
                const packageData = packageSnap.data();

                await setDoc(packageRef, {
                    ...packageData,
                    remainingCuts: Math.min(packageData.remainingCuts + 1, 5)
                });
            }
        }
    }

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    showSuccessPopup("התור בוטל בהצלחה");
    loadAppointments();
}


window.adminCancelBooking = adminCancelBooking;
function showAdminConfirm(message) {
    return new Promise((resolve) => {
        const popup = document.createElement("div");
        popup.className = "admin-popup";

        popup.innerHTML = `
            <div class="admin-popup-card">
                <h2>אישור פעולה</h2>
                <p>${message}</p>
                <div class="admin-popup-actions">
                    <button class="confirm-yes">כן, לבטל</button>
                    <button class="confirm-no">חזרה</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        popup.querySelector(".confirm-yes").onclick = function() {
            popup.remove();
            resolve(true);
        };

        popup.querySelector(".confirm-no").onclick = function() {
            popup.remove();
            resolve(false);
        };
    });
}

function showAdminToast(text) {
    const toast = document.createElement("div");
    toast.className = "admin-toast";
    toast.textContent = text;
    document.body.appendChild(toast);

    setTimeout(function() {
        toast.remove();
    }, 1800);
}
function showPopup(message, onConfirm) {

    const popup = document.getElementById("customPopup");
    const text = document.getElementById("popupText");
    const confirmBtn = document.getElementById("confirmBtn");
    const cancelBtn = document.getElementById("cancelBtn");

    text.textContent = message;

    popup.style.display = "flex";

    confirmBtn.onclick = function() {
        popup.style.display = "none";
        onConfirm();
    };

    cancelBtn.onclick = function() {
        popup.style.display = "none";
    };
}

function showSuccessPopup(message) {

    const popup = document.getElementById("customPopup");
    const text = document.getElementById("popupText");

    popup.classList.add("success-popup");

    text.textContent = message;

    document.querySelector(".popup-buttons").style.display = "none";

    popup.style.display = "flex";

    setTimeout(function() {
        popup.style.display = "none";
        popup.classList.remove("success-popup");

        document.querySelector(".popup-buttons").style.display = "flex";
    }, 1800);
}
loadAppointments();
window.loadAppointments = loadAppointments;