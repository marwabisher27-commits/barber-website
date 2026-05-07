import { db, collection, doc, deleteDoc } from "./firebase.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const daySelect = document.getElementById("adminDaySelect");
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

function buildDayOptions() {
    daySelect.innerHTML = "";

    

    const today = new Date();

    let startSunday = new Date(today);
    startSunday.setDate(today.getDate() - today.getDay());

    for (let i = 0; i < 7; i++) {
        const date = new Date(startSunday);
        date.setDate(startSunday.getDate() + i);

        const dayName = dayNames[date.getDay()];
        const dateText =
            String(date.getDate()).padStart(2, "0") +
            "/" +
            String(date.getMonth() + 1).padStart(2, "0");

        const fullDay = dayName + " " + dateText;

        const option = document.createElement("option");
        option.value = fullDay;
        option.textContent = fullDay;

        daySelect.appendChild(option);
    }

    const todayName = dayNames[today.getDay()];
    const todayText =
        String(today.getDate()).padStart(2, "0") +
        "/" +
        String(today.getMonth() + 1).padStart(2, "0");

    daySelect.value = todayName + " " + todayText;
    showSchedule(daySelect.value);
}

async function loadAppointments() {
    allAppointments = [];

    const snapshot = await getDocs(collection(db, "appointments"));

    snapshot.forEach(function(doc) {
        allAppointments.push({
    id: doc.id,
    ...doc.data()
});
    });

    buildDayOptions();
}

daySelect.addEventListener("change", function() {
    showSchedule(daySelect.value);
});

function showSchedule(selectedDay) {
    scheduleBox.innerHTML = "";

    const dayName = selectedDay.split(" ")[0];
    const hours = workingHours[dayName];

    if (!hours) {
        scheduleBox.innerHTML = `
    <div class="admin-closed-day">
        🔒 המספרה סגורה ביום זה
    </div>
`;
        return;
    }

    const times = createTimes(hours[0], hours[1]);

    times.forEach(function(time) {
        const appointment = allAppointments.find(function(app) {
            return app.day === selectedDay && app.time === time;
        });

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

        scheduleBox.appendChild(slot);
    });
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
    const ok = confirm("לבטל את התור הזה?");

    if (!ok) return;

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    alert("התור בוטל בהצלחה");
    loadAppointments();
}

window.adminCancelBooking = adminCancelBooking;
