import { db, collection, addDoc, doc, getDoc, setDoc } from "./firebase.js";

const daysGrid = document.getElementById("daysGrid");
const timesGrid = document.getElementById("timesGrid");
const serviceSelect = document.getElementById("serviceSelect");
const customerName = document.getElementById("customerName");
const customerPhone = document.getElementById("customerPhone");
const appointmentPaymentMethod = document.getElementById("appointmentPaymentMethod");

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

appointmentPaymentMethod.addEventListener("change", updateSummary);

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

        const slotId = fullDay.replaceAll(" ", "_").replace("/", "-") + "_" + time.replace(":", "-");
        const slotRef = doc(db, "bookedSlots", slotId);
        const slotSnap = await getDoc(slotRef);

        if (slotSnap.exists()) {
            button.classList.add("booked");
            button.textContent = time + " תפוס";
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

        result.push(
            String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0")
        );

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
        <p>תשלום: ${appointmentPaymentMethod.value || "לא נבחר"}</p>
    `;
}

async function confirmBooking() {
    if (
        serviceSelect.value === "" ||
        selectedDay === "" ||
        selectedTime === "" ||
        appointmentPaymentMethod.value === "" ||
        customerName.value === "" ||
        customerPhone.value === ""
    ) {
        showMessage("נא למלא את כל הפרטים");
        return;
    }

    if (!/^[0-9]{10}$/.test(customerPhone.value)) {
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
     let usedPackage = null;

if (serviceSelect.value === "תספורת מבוגרים") {
    const packageRef = doc(db, "packages", customerPhone.value + "_adults");
    const packageSnap = await getDoc(packageRef);

    if (packageSnap.exists() && packageSnap.data().remainingCuts > 0) {
        const packageData = packageSnap.data();
        usedPackage = {
            type: "מבוגרים",
            remainingBefore: packageData.remainingCuts,
            remainingAfter: packageData.remainingCuts - 1
        };

        await setDoc(packageRef, {
            ...packageData,
            remainingCuts: packageData.remainingCuts - 1
        });

        appointmentPaymentMethod.value = "package";
        showMessage("נותרו לך " + usedPackage.remainingAfter + " תספורות");
    }
}

if (serviceSelect.value === "תספורת ילדים") {
    const packageRef = doc(db, "packages", customerPhone.value + "_kids");
    const packageSnap = await getDoc(packageRef);

    if (packageSnap.exists() && packageSnap.data().remainingCuts > 0) {
        const packageData = packageSnap.data();
        usedPackage = {
            type: "ילדים",
            remainingBefore: packageData.remainingCuts,
            remainingAfter: packageData.remainingCuts - 1
        };

        await setDoc(packageRef, {
            ...packageData,
            remainingCuts: packageData.remainingCuts - 1
        });

        appointmentPaymentMethod.value = "package";
        showMessage("נותרו לך " + usedPackage.remainingAfter + " תספורות");
    }
}
    await setDoc(slotRef, {
        day: selectedDay,
        time: selectedTime,
        createdAt: new Date()
    });

    let packageInfo = null;

    if (serviceSelect.value === 
"5 תספורות מבוגרים") {
        packageInfo = {
            phone: customerPhone.value,
            type: "מבוגרים",
            totalCuts: 5,
            remainingCuts: 5,
            createdAt: new Date()
        };

        await setDoc(doc(db, "packages", customerPhone.value + "_adults"), packageInfo);
    }

    if (serviceSelect.value === 
"5 תספורות מבוגרים") {
        packageInfo = {
            phone: customerPhone.value,
            type: "ילדים",
            totalCuts: 5,
            remainingCuts: 5,
            createdAt: new Date()
        };

        await setDoc(doc(db, "packages", customerPhone.value + "_kids"), packageInfo);
    }

   await addDoc(collection(db, "appointments"), {
    service: serviceSelect.value,
    day: selectedDay,
    time: selectedTime,
    payment: appointmentPaymentMethod.value,
    name: customerName.value,
    phone: customerPhone.value,
    package: packageInfo,
    usedPackage: usedPackage,
    createdAt: new Date()
});

    localStorage.setItem("appointment", JSON.stringify({
        service: serviceSelect.value,
        day: selectedDay,
        time: selectedTime,
        payment: appointmentPaymentMethod.value
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