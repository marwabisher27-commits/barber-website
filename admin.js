import { db, collection, addDoc, doc, getDoc, setDoc } from "./firebase.js";
import { getDocs, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const scheduleBox = document.getElementById("adminSchedule");

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
    if (!appointment || (!appointment.usedPackage && !appointment.package)) return "";

    const typeKey = appointment.service.includes("ילדים") ? "_kids" : "_adults";
    const packageRef = doc(db, "packages", appointment.phone + typeKey);
    const packageSnap = await getDoc(packageRef);

    if (!packageSnap.exists()) return "";

    const packageData = packageSnap.data();
    return `<p>חבילה: ${packageData.type} | נותרו: ${packageData.remainingCuts}</p>`;
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

async function recalculatePackage(phone, type) {
    const snapshot = await getDocs(collection(db, "appointments"));
    let used = 0;

    snapshot.forEach(function(document) {
        const app = document.data();

        if (app.phone === phone) {
            if (type === "מבוגרים" && app.service.includes("מבוגרים")) used++;
            if (type === "ילדים" && app.service.includes("ילדים")) used++;
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

async function loadAppointments() {
    const snapshot = await getDocs(collection(db, "appointments"));
    allAppointments = [];

    snapshot.forEach(function(document) {
        allAppointments.push({
            id: document.id,
            ...document.data()
        });
    });

    await showFullWeek();
}

async function showFullWeek() {
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

                const packageText = appointment ? await getCurrentPackageText(appointment) : "";

                const slot = document.createElement("div");
                slot.className = "admin-slot";

                if (appointment) {
                    slot.classList.add("busy");

                    const cancelButton = isPastAppointment(appointment.day, appointment.time)
                        ? `<p>התור עבר ולא ניתן לבטל</p>`
                        : `<button onclick="adminCancelBooking('${appointment.id}', '${appointment.day}', '${appointment.time}')">ביטול תור</button>`;

                    slot.innerHTML = `
                        <strong>${time}</strong>
                        <p>${appointment.name}</p>
                        <p>${appointment.phone}</p>
                        <p>${appointment.service}</p>
                        <p>${appointment.payment === "cash" ? "מזומן במספרה" : appointment.payment === "package" ? "חבילה" : "אשראי"}</p>
                        ${packageText}
                        ${cancelButton}

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
<button onclick="blockSlot('${fullDay}', '${time}')">סגור שעה</button>
                    `;
                }

                dayBox.appendChild(slot);
            }
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

    let oldAppointment = null;

    if (appointmentSnap.exists()) {
        oldAppointment = appointmentSnap.data();
    }

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    if (oldAppointment) {
        if (oldAppointment.service.includes("מבוגרים")) {
            await recalculatePackage(oldAppointment.phone, "מבוגרים");
        }

        if (oldAppointment.service.includes("ילדים")) {
            await recalculatePackage(oldAppointment.phone, "ילדים");
        }
    }

    showSuccessPopup("התור בוטל בהצלחה");
    await loadAppointments();
}

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

function showSuccessPopup(message) {
    const toast = document.createElement("div");
    toast.className = "admin-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(function() {
        toast.remove();
    }, 1800);
}

window.adminCancelBooking = adminCancelBooking;
window.loadAppointments = loadAppointments;
async function blockSlot(day, time) {
    const reason = prompt("סיבת סגירה? למשל: הפסקה");

    if (!reason) {
        return;
    }

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await setDoc(doc(db, "blockedSlots", slotId), {
        day: day,
        time: time,
        reason: reason,
        createdAt: new Date()
    });

    showSuccessPopup("השעה נסגרה בהצלחה");
    await loadAppointments();
}

window.blockSlot = blockSlot;
loadAppointments();