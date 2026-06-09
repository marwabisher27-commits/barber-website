import { db, collection, doc, deleteDoc, messaging } from "./firebase.js";
import { getDocs, getDoc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getToken } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const daysBox = document.getElementById("adminDays");
const scheduleBox = document.getElementById("adminDaySchedule");
const detailsBox = document.getElementById("adminClientDetails");
const monthSelect = document.getElementById("adminMonth");
const yearSelect = document.getElementById("adminYear");
const weekRange = document.getElementById("weekRange");
const prevWeekBtn = document.getElementById("prevWeekBtn");
const nextWeekBtn = document.getElementById("nextWeekBtn");

const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

const servicePrices = {
    "תספורת מבוגרים": 70,
    "תספורת ילדים": 30,
    "זקן": 20,
    "תספורת מבוגרים עם זקן": 90
};

const workingHours = {
    "ראשון": ["14:00", "23:00"],
    "שני": ["14:00", "23:00"],
    "שלישי": ["14:00", "23:00"],
    "רביעי": null,
    "חמישי": ["14:00", "23:00"],
    "שישי": ["14:00", "23:00"],
    "שבת": ["10:00", "23:00"]
};

let allAppointments = [];
let selectedMonth = new Date().getMonth();
let selectedYear = new Date().getFullYear();
let currentWeekStart = getWeekStart(new Date());
let selectedDay = "";

onAuthStateChanged(auth, function(user) {
    if (!user) {
        location.replace("login.html");
        return;
    }

    document.body.style.display = "block";
    buildFilters();
    loadAppointments();
});

function getAppointmentPrice(app) {
    return Number(app.price) || servicePrices[app.service] || 0;
}

function formatDate(date) {
    return String(date.getDate()).padStart(2, "0") + "/" + String(date.getMonth() + 1).padStart(2, "0");
}

function fullDayText(date) {
    return dayNames[date.getDay()] + " " + formatDate(date);
}

function getWeekStart(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
}

function createTimes(start, end) {
    const result = [];
    let [sh, sm] = start.split(":").map(Number);
    let [eh, em] = end.split(":").map(Number);

    let current = sh * 60 + sm;
    let finish = eh * 60 + em;

    while (current <= finish) {
        let h = Math.floor(current / 60);
        let m = current % 60;
        result.push(String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"));
        current += 30;
    }

    return result;
}

function isPastAppointment(day, time) {
    const datePart = day.split(" ")[1];
    const [d, m] = datePart.split("/").map(Number);
    const [h, min] = time.split(":").map(Number);

    const appDate = new Date(selectedYear, m - 1, d, h, min);
    return new Date() > appDate;
}

function buildFilters() {
    monthSelect.innerHTML = "";

    for (let i = 1; i <= 12; i++) {
        monthSelect.innerHTML += `<option value="${i - 1}">${i}</option>`;
    }

    const currentYear = new Date().getFullYear();

    yearSelect.innerHTML = `
        <option value="${currentYear}">${currentYear}</option>
    `;

    selectedYear = currentYear;
    yearSelect.value = selectedYear;
    monthSelect.value = selectedMonth;
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

    renderWeek();
}

function renderWeek() {
    daysBox.innerHTML = "";
    scheduleBox.innerHTML = "";
    detailsBox.innerHTML = "";

    const monthTotal = allAppointments
        .filter(app => {
            if (!app.day) return false;
            const datePart = app.day.split(" ")[1];
            if (!datePart) return false;
            const [d, m] = datePart.split("/").map(Number);
            return m - 1 === selectedMonth;
        })
        .reduce((sum, app) => sum + getAppointmentPrice(app), 0);

    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);

    const firstWeekStart = getWeekStart(firstDay);
    const lastWeekStart = getWeekStart(lastDay);

    if (currentWeekStart < firstWeekStart) currentWeekStart = firstWeekStart;
    if (currentWeekStart > lastWeekStart) currentWeekStart = lastWeekStart;

    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);

    weekRange.textContent =
        formatDate(currentWeekStart) +
        " - " +
        formatDate(weekEnd) +
        " | סה״כ החודש: ₪" +
        monthTotal;

    prevWeekBtn.disabled = currentWeekStart.getTime() <= firstWeekStart.getTime();
    nextWeekBtn.disabled = currentWeekStart.getTime() >= lastWeekStart.getTime();

    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);

        const fullDay = fullDayText(date);

        const dayAppointments = allAppointments.filter(app => app.day === fullDay);
        const count = dayAppointments.length;
        const dayTotal = dayAppointments.reduce((sum, app) => sum + getAppointmentPrice(app), 0);

        const card = document.createElement("div");
        card.className = "admin-day-card";

        if (fullDay === selectedDay) card.classList.add("active");

        card.innerHTML = `
            <div>${dayNames[date.getDay()]}</div>
            <strong>${formatDate(date)}</strong>
            <p>לקוחות: ${count}</p>
            <p>סכום: ₪${dayTotal}</p>
        `;

        card.onclick = function() {
            selectedDay = fullDay;
            renderWeek();
            renderDaySchedule(date, fullDay);
        };

        daysBox.appendChild(card);
    }
}

async function renderDaySchedule(date, fullDay) {
    scheduleBox.innerHTML = "";
    detailsBox.innerHTML = "";

    const dayName = dayNames[date.getDay()];
    const hours = workingHours[dayName];

    scheduleBox.innerHTML = `<h2>${fullDay}</h2>`;

    if (!hours) {
        scheduleBox.innerHTML += `<div class="admin-closed-day">🔒 המספרה סגורה ביום זה</div>`;
        return;
    }

    const times = createTimes(hours[0], hours[1]);

    for (const time of times) {
        const appointment = allAppointments.find(app => app.day === fullDay && app.time === time);

        const slotId =
            fullDay.replaceAll(" ", "_").replaceAll("/", "-") +
            "_" +
            time.replace(":", "-");

        const blockedSnap = await getDoc(doc(db, "blockedSlots", slotId));

        const row = document.createElement("div");
        row.className = "admin-time-row";

        if (appointment) {
            row.innerHTML = `
                <strong>${time}</strong>
                <span class="admin-client-name" onclick="showClientDetails('${appointment.id}')">
                    ${appointment.name}
                </span>
                <span>תפוס</span>
            `;
        } else if (blockedSnap.exists()) {
            row.innerHTML = `
                <strong>${time}</strong>
                <span>לא זמין</span>
                <button onclick="unblockSlot('${fullDay}', '${time}')">פתח שעה</button>
            `;
        } else {
            const action = isPastAppointment(fullDay, time)
                ? `<span class="past-admin-text">השעה עברה</span>`
                : `
                    <div class="admin-slot-buttons">
                        <button onclick="registerWalkIn('${fullDay}', '${time}')">רישום לקוח לשעה זו</button>
                        <button onclick="blockSlot('${fullDay}', '${time}')">סגור שעה</button>
                    </div>
                `;

            row.innerHTML = `
                <strong>${time}</strong>
                <span>פנוי</span>
                ${action}
            `;
        }

        scheduleBox.appendChild(row);
    }
}

function showClientDetails(id) {
    const appointment = allAppointments.find(app => app.id === id);
    if (!appointment) return;

    const price = getAppointmentPrice(appointment);

    const buttons = isPastAppointment(appointment.day, appointment.time)
        ? `<p class="past-admin-text">התור עבר ולא ניתן לבטל</p>`
        : `
            <button onclick="adminCancelBooking('${appointment.id}', '${appointment.day}', '${appointment.time}')">ביטול תור</button>
            <button onclick="markUnpaid('${appointment.id}', '${appointment.day}', '${appointment.time}')">לא שולם</button>
        `;

    detailsBox.innerHTML = `
        <div class="client-modal">
            <div class="client-modal-card">
                <button class="client-close" onclick="closeClientDetails()">✕</button>

                <strong>${appointment.time}</strong>
                <p>${appointment.name}</p>
                <p>${appointment.phone || ""}</p>
                <p>${appointment.service}</p>
                <p>מחיר: ₪${price}</p>

                ${appointment.phone ? `
                    <a class="admin-whatsapp" href="https://wa.me/972${appointment.phone.substring(1)}" target="_blank">WhatsApp</a>
                    <a class="admin-call" href="tel:${appointment.phone}">📞</a>
                ` : ""}

                ${buttons}
            </div>
        </div>
    `;
}

function closeClientDetails() {
    detailsBox.innerHTML = "";
}

async function adminCancelBooking(appointmentId, day, time) {
    const ok = await showAdminConfirm("לבטל את התור הזה?");
    if (!ok) return;

    const appointment = allAppointments.find(app => app.id === appointmentId);

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    await addDoc(collection(db, "notifications"), {
        type: "cancel_booking",
        title: "ביטול תור",
        message: (appointment?.name || "לקוח/ה") + " ביטל/ה תור ל-" + day + " בשעה " + time,
        name: appointment?.name || "",
        phone: appointment?.phone || "",
        service: appointment?.service || "",
        day: day,
        time: time,
        seen: false,
        createdAt: new Date()
    });

    showSuccessPopup("התור בוטל בהצלחה");
    await loadAppointments();
}

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

async function blockSlot(day, time) {
    const ok = await showAdminConfirm("לסגור את השעה הזאת?");
    if (!ok) return;

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await setDoc(doc(db, "blockedSlots", slotId), {
        day: day,
        time: time,
        createdAt: new Date()
    });

    showSuccessPopup("השעה נסגרה בהצלחה");
    await loadAppointments();
}

async function unblockSlot(day, time) {
    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "blockedSlots", slotId));

    showSuccessPopup("השעה נפתחה בהצלחה");
    await loadAppointments();
}

async function registerWalkIn(day, time) {
    const name = await showInputPopup("שם לקוח");
    if (!name) return;

    const phone = await showInputPopup("מספר טלפון");
    if (!phone) return;

    const service = await showInputPopup("שירות");
    if (!service) return;

    const price = servicePrices[service] || 0;

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await setDoc(doc(db, "bookedSlots", slotId), {
        day: day,
        time: time,
        createdAt: new Date()
    });

    await setDoc(doc(db, "appointments", slotId), {
        name,
        phone,
        service,
        price,
        day,
        time,
        createdAt: new Date(),
        source: "admin"
    });

    showSuccessPopup("לקוח נרשם בהצלחה");
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

        popup.querySelector(".confirm-yes").onclick = () => {
            popup.remove();
            resolve(true);
        };

        popup.querySelector(".confirm-no").onclick = () => {
            popup.remove();
            resolve(false);
        };
    });
}

function playBeep() {
    const audio = new Audio("https://actions.google.com/sounds/v1/cartoon/woodpecker.ogg?hl=he");
    audio.volume = 1;
    audio.play().catch(() => {});
}

function showSuccessPopup(message) {
    const toast = document.createElement("div");
    toast.className = "admin-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 1800);
}

monthSelect.onchange = function() {
    selectedMonth = Number(monthSelect.value);
    currentWeekStart = getWeekStart(new Date(selectedYear, selectedMonth, 1));
    selectedDay = "";
    renderWeek();
};

yearSelect.onchange = function() {
    selectedYear = Number(yearSelect.value);
    currentWeekStart = getWeekStart(new Date(selectedYear, selectedMonth, 1));
    selectedDay = "";
    renderWeek();
};

prevWeekBtn.onclick = function() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    selectedDay = "";
    renderWeek();
};

nextWeekBtn.onclick = function() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    selectedDay = "";
    renderWeek();
};

async function enableNotifications() {
    try {
        if (!("Notification" in window)) {
            showSuccessPopup("צריך לפתוח מהאפליקציה במסך הבית");
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            showSuccessPopup("לא אושרו התראות");
            return;
        }

        const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js");

        const token = await getToken(messaging, {
            vapidKey: "BKAQ7slaq_rA5DlFngXXFdoaRSXmfu7gUxYHqjZKJp_ILesE5q7IzNXymKiaxPTQ5Ar51v7jzzwq5LVkfYms8bo",
            serviceWorkerRegistration: registration
        });

        await setDoc(doc(db, "adminTokens", "mainAdmin"), {
            token: token,
            createdAt: new Date()
        });

        const btn = document.getElementById("enableNotificationsBtn");
        btn.innerHTML = "✅ התראות פעילות";
        btn.classList.add("enabled");
        btn.disabled = true;

        showSuccessPopup("ההתראות הופעלו בהצלחה");
    } catch (error) {
        console.error(error);
        alert(error.message);
        showSuccessPopup("שגיאה בהפעלת התראות");
    }
}

async function disableNotifications() {
    try {
        await deleteDoc(doc(db, "adminTokens", "mainAdmin"));

        const enableBtn = document.getElementById("enableNotificationsBtn");
        const disableBtn = document.getElementById("disableNotificationsBtn");

        enableBtn.innerHTML = "🔔 הפעל התראות";
        enableBtn.classList.remove("enabled");
        enableBtn.disabled = false;

        disableBtn.innerHTML = "🔕 ההתראות כבויות";

        showSuccessPopup("ההתראות כובו בהצלחה");
    } catch (error) {
        console.error(error);
        showSuccessPopup("שגיאה בכיבוי התראות");
    }
}

window.closeClientDetails = closeClientDetails;
window.adminCancelBooking = adminCancelBooking;
window.markUnpaid = markUnpaid;
window.registerWalkIn = registerWalkIn;
window.blockSlot = blockSlot;
window.unblockSlot = unblockSlot;
window.showClientDetails = showClientDetails;
window.enableNotifications = enableNotifications;
window.disableNotifications = disableNotifications;

document.getElementById("enableNotificationsBtn").addEventListener("click", enableNotifications);
document.getElementById("disableNotificationsBtn").addEventListener("click", disableNotifications);