import { db, collection, doc, deleteDoc } from "./firebase.js";
import { getDocs, getDoc, setDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";import { messaging } from "./firebase.js";
import { getToken } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging.js";
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

                const slotId =
                    fullDay.replaceAll(" ", "_").replaceAll("/", "-") +
                    "_" +
                    time.replace(":", "-");

                const blockedSnap = await getDoc(doc(db, "blockedSlots", slotId));

                const slot = document.createElement("div");
                slot.className = "admin-slot";

                if (appointment) {
                    slot.classList.add("busy");

                    const cancelButton = isPastAppointment(appointment.day, appointment.time)
                        ? `<p class="past-admin-text">התור עבר ולא ניתן לבטל</p>`
                        : `
                            <button onclick="adminCancelBooking('${appointment.id}', '${appointment.day}', '${appointment.time}')">
                                ביטול תור
                            </button>
                            <button onclick="markUnpaid('${appointment.id}', '${appointment.day}', '${appointment.time}')">
    לא שולם
</button>
                        `;

                    const phoneText = appointment.phone ? `<p>${appointment.phone}</p>` : "";

                    slot.innerHTML = `
                        <strong>${time}</strong>
                        <p>${appointment.name}</p>
                        ${phoneText}
                        <p>${appointment.service}</p>
                        ${cancelButton}

                        ${appointment.phone ? `
                           <a class="admin-whatsapp"
                              href="https://wa.me/972${appointment.phone.substring(1)}"
                            target="_blank">
                                WhatsApp
                            </a>

                            <a class="admin-call" href="tel:${appointment.phone}">
    📞
</a>
                        ` : ""}
                    `;
                } else if (blockedSnap.exists()) {
                    slot.classList.add("busy");
                    slot.innerHTML = `
                        <strong>${time}</strong>
                        <p>לא זמין</p>
                        <button onclick="unblockSlot('${fullDay}', '${time}')">
                            פתח שעה
                        </button>
                    `;
                } else {
                    const blockButton = isPastAppointment(fullDay, time)
                        ? `<p class="past-admin-text">השעה עברה</p>`
                        : `
                            <button onclick="registerWalkIn('${fullDay}', '${time}')">
                                רישום לקוח בשעה זו
                            </button>

                            <button onclick="blockSlot('${fullDay}', '${time}')">
                                סגור שעה
                            </button>
                        `;

                    slot.innerHTML = `
                        <strong>${time}</strong>
                        <p>פנוי</p>
                        ${blockButton}
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

    const slotId =
        day.replaceAll(" ", "_").replaceAll("/", "-") +
        "_" +
        time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    showSuccessPopup("התור בוטל בהצלחה");
    await loadAppointments();
}

async function blockSlot(day, time) {
    const ok = await showAdminConfirm("לסגור את השעה הזאת?");
    if (!ok) return;

    const slotId =
        day.replaceAll(" ", "_").replaceAll("/", "-") +
        "_" +
        time.replace(":", "-");

    await setDoc(doc(db, "blockedSlots", slotId), {
        day: day,
        time: time,
        createdAt: new Date()
    });

    showSuccessPopup("השעה נסגרה בהצלחה");
    await loadAppointments();
}

async function unblockSlot(day, time) {
    const slotId =
        day.replaceAll(" ", "_").replaceAll("/", "-") +
        "_" +
        time.replace(":", "-");

    await deleteDoc(doc(db, "blockedSlots", slotId));

    showSuccessPopup("השעה נפתחה בהצלחה");
    await loadAppointments();
}

async function registerWalkIn(day, time) {
    const name = await showInputPopup("שם לקוח");
    if (!name) return;

    const phone = await showInputPopup("מספר טלפון");
    if (!phone) return;

    const service = await showInputPopup("שירות: תספורת מבוגרים / תספורת ילדים / סידור זקן");
    if (!service) return;

    const slotId =
        day.replaceAll(" ", "_").replaceAll("/", "-") +
        "_" +
        time.replace(":", "-");

    await setDoc(doc(db, "bookedSlots", slotId), {
        day: day,
        time: time,
        createdAt: new Date()
    });

    await setDoc(doc(db, "appointments", slotId), {
        name: name,
        phone: phone,
        service: service,
        day: day,
        time: time,
        createdAt: new Date(),
        source: "admin"
    });

    showSuccessPopup("הלקוח נרשם בהצלחה");
    await loadAppointments();
}

function showInputPopup(label) {
    return new Promise((resolve) => {
        const popup = document.createElement("div");
        popup.className = "admin-popup";

        popup.innerHTML = `
            <div class="admin-popup-card">
                <h2>${label}</h2>
                <input class="admin-popup-input" type="text">

                <div class="admin-popup-actions">
                    <button class="confirm-yes">אישור</button>
                    <button class="confirm-no">ביטול</button>
                </div>
            </div>
        `;

        document.body.appendChild(popup);

        const input = popup.querySelector(".admin-popup-input");
        input.focus();

        popup.querySelector(".confirm-yes").onclick = function() {
            const value = input.value.trim();
            popup.remove();
            resolve(value);
        };

        popup.querySelector(".confirm-no").onclick = function() {
            popup.remove();
            resolve("");
        };
    });
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
                    <button class="confirm-yes">כן</button>
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

let lastAppointmentsCount = 0;
let firstCheck = true;

function playBeep() {
    const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
    audio.volume = 1;
    audio.play().catch(() => {});
}

async function checkNewActivity() {
    const apps = await getDocs(collection(db, "appointments"));
    const total = apps.size;

    if (firstCheck) {
        lastAppointmentsCount = total;
        firstCheck = false;
        return;
    }

    if (total > lastAppointmentsCount) {
        showSuccessPopup("התקבל תור חדש");
        playBeep();
        await loadAppointments();
    }

    lastAppointmentsCount = total;
}

window.adminCancelBooking = adminCancelBooking;
window.blockSlot = blockSlot;
window.unblockSlot = unblockSlot;
window.registerWalkIn = registerWalkIn;
window.loadAppointments = loadAppointments;
async function markUnpaid(appointmentId, day, time) {
    const appointmentSnap = await getDoc(doc(db, "appointments", appointmentId));
    if (!appointmentSnap.exists()) return;

    const appointment = appointmentSnap.data();

    const amount = Number(await showInputPopup("כמה צריך לשלם?"));
    if (!amount) return;

    await addDoc(collection(db, "unpaid"), {
        name: appointment.name,
        phone: appointment.phone || "",
        service: appointment.service,
        amount: amount,
        day: day,
        time: time,
        createdAt: new Date()
    });

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    showSuccessPopup("נשמר כלקוח שלא שילם");
    await loadAppointments();
}

window.markUnpaid = markUnpaid;
import { getDocs, getDoc, setDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
setInterval(checkNewActivity, 15000);
checkNewActivity();
async function enableNotifications() {
    try {
        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            showSuccessPopup("לא אושרו התראות");
            return;
        }

        const registration = await navigator.serviceWorker.register(
            "./firebase-messaging-sw.js"
        );

        const token = await getToken(messaging, {
            vapidKey: "BKAQ7slaq_rA5DlFngXXFdoaRSXmfu7gUxYHqjZKJp_ILesE5q7IzNXymKiaxPTQ5Ar51v7jzzwq5LVkfYms8bo",
            serviceWorkerRegistration: registration
        });

        await setDoc(doc(db, "adminTokens", token), {
            token: token,
            createdAt: new Date()
        });

        showSuccessPopup("ההתראות הופעלו בהצלחה");
    } catch (error) {
        console.error(error);
        alert(error.message);
        showSuccessPopup("שגיאה בהפעלת התראות");
    }
}
window.enableNotifications = enableNotifications;
loadAppointments();