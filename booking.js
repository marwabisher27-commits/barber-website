import { db, collection, addDoc, doc, getDoc, setDoc } from "./firebase.js";

const daysGrid = document.getElementById("daysGrid");
const timesGrid = document.getElementById("timesGrid");
const serviceSelect = document.getElementById("serviceSelect");
const customerName = document.getElementById("customerName");
const customerPhone = document.getElementById("customerPhone");

let selectedDay = "";
let selectedTime = "";
let selectedService = "";

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

    const button = document.createElement("button");
    button.className = "day-card";
    button.innerHTML = `<span>${dayName}</span><strong>${dateText}</strong>`;

    if (i === today.getDay()) {
        button.classList.add("today");
    }

    if (workingHours[dayName] === null) {
        button.classList.add("closed");
        button.innerHTML = `<span>${dayName}</span><strong>${dateText}</strong><small>🔒 סגור</small>`;
        button.disabled = true;
    }

    button.addEventListener("click", function() {
        selectedDay = dayName + " " + dateText;
        selectedTime = "";

        document.querySelectorAll(".day-card").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        showTimes(dayName, selectedDay);
        updateSummary();
    });

    daysGrid.appendChild(button);
}

serviceSelect.addEventListener("change", function() {
    selectedService = serviceSelect.value;
    updateSummary();
});

function isPastTime(fullDay, time) {
    const datePart = fullDay.split(" ")[1];
    const [dayNum, monthNum] = datePart.split("/").map(Number);
    const [hour, minute] = time.split(":").map(Number);

    const appointmentDate = new Date();
    appointmentDate.setMonth(monthNum - 1);
    appointmentDate.setDate(dayNum);
    appointmentDate.setHours(hour, minute, 0, 0);

    return new Date() > appointmentDate;
}

async function showTimes(dayName, fullDay) {
    timesGrid.innerHTML = "";

    const hours = workingHours[dayName];

    if (!hours) {
        timesGrid.innerHTML = "<p class='choose-day-text'>המספרה סגורה ביום זה</p>";
        return;
    }

    const times = createTimes(hours[0], hours[1]);

    for (const time of times) {
        const button = document.createElement("button");
        button.className = "time-card";
        button.textContent = time;

        const slotId = fullDay.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

        if (isPastTime(fullDay, time)) {
            button.classList.add("past-time");
            button.textContent = time + " עבר";
            button.disabled = true;
        }

        const slotSnap = await getDoc(doc(db, "bookedSlots", slotId));

        if (slotSnap.exists()) {
            button.classList.add("booked");
            button.textContent = time + " תפוס";
            button.disabled = true;
        }

        const blockedSnap = await getDoc(doc(db, "blockedSlots", slotId));

        if (blockedSnap.exists()) {
            button.classList.add("booked");
            button.textContent = time + " לא זמין";
            button.disabled = true;
        }

        button.addEventListener("click", function() {
            selectedTime = time;

            document.querySelectorAll(".time-card").forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            updateSummary();
        });

        timesGrid.appendChild(button);
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

        result.push(String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0"));

        current += 30;
    }

    return result;
}

function updateSummary() {
    const summary = document.getElementById("bookingSummary");

    summary.innerHTML = `
        <h3>סיכום התור</h3>
        <p>שירות: ${selectedService || "לא נבחר"}</p>
        <p>יום: ${selectedDay || "לא נבחר"}</p>
        <p>שעה: ${selectedTime || "לא נבחר"}</p>
    `;
}

async function confirmBooking() {
    if (
        serviceSelect.value === "" ||
        selectedDay === "" ||
        selectedTime === "" ||
        customerName.value.trim() === "" ||
        customerPhone.value.trim() === ""
    ) {
        showMessage("נא למלא את כל הפרטים");
        return;
    }

    if (!/^[0-9]{10}$/.test(customerPhone.value.trim())) {
        showMessage("מספר טלפון חייב להיות 10 ספרות");
        return;
    }

    const slotId = selectedDay.replaceAll(" ", "_").replaceAll("/", "-") + "_" + selectedTime.replace(":", "-");
    const slotRef = doc(db, "bookedSlots", slotId);
    const slotSnap = await getDoc(slotRef);

    if (slotSnap.exists()) {
        showMessage("השעה הזאת כבר תפוסה");
        return;
    }

    const blockedSnap = await getDoc(doc(db, "blockedSlots", slotId));

    if (blockedSnap.exists()) {
        showMessage("השעה הזאת לא זמינה");
        return;
    }

    await setDoc(slotRef, {
        day: selectedDay,
        time: selectedTime,
        createdAt: new Date()
    });

    await addDoc(collection(db, "appointments"), {
        service: serviceSelect.value,
        day: selectedDay,
        time: selectedTime,
        name: customerName.value.trim(),
        phone: customerPhone.value.trim(),
        payment: "",
        createdAt: new Date()
    });
await addDoc(collection(db, "notifications"), {
    type: "new_booking",
    title: "תור חדש",
    message: customerName.value.trim() + " קבע/ה תור ל-" + selectedDay + " בשעה " + selectedTime,
    name: customerName.value.trim(),
    phone: customerPhone.value.trim(),
    service: serviceSelect.value,
    day: selectedDay,
    time: selectedTime,
    seen: false,
    createdAt: new Date()
});
    localStorage.setItem("appointment", JSON.stringify({
        service: serviceSelect.value,
        day: selectedDay,
        time: selectedTime
    }));

    showMessage("התור נקבע בהצלחה");
    showTimes(selectedDay.split(" ")[0], selectedDay);
}

function showMessage(text) {
    const message = document.createElement("div");
    message.className = "toast-message";
    message.textContent = text;
    document.body.appendChild(message);

    setTimeout(function() {
        message.remove();
    }, 1800);
}

updateSummary();
window.confirmBooking = confirmBooking;