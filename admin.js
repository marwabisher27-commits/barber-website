import { db, collection } from "./firebase.js";
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

let allAppointments = [];

async function loadAppointments() {
    const snapshot = await getDocs(collection(db, "appointments"));

    allAppointments = [];

    snapshot.forEach(function(doc) {
        allAppointments.push(doc.data());
    });

    buildDayOptions();
}

function buildDayOptions() {
    daySelect.innerHTML = "";

    const uniqueDays = [...new Set(allAppointments.map(app => app.day))];

    uniqueDays.forEach(function(day) {
        const option = document.createElement("option");
        option.value = day;
        option.textContent = day;
        daySelect.appendChild(option);
    });

    if (uniqueDays.length > 0) {
        showSchedule(uniqueDays[0]);
    } else {
        scheduleBox.innerHTML = "<p>אין תורים כרגע</p>";
    }
}

daySelect.addEventListener("change", function() {
    showSchedule(daySelect.value);
});

function showSchedule(selectedDay) {
    scheduleBox.innerHTML = "";

    const dayName = selectedDay.split(" ")[0];
    const hours = workingHours[dayName];

    if (!hours) {
        scheduleBox.innerHTML = "<p>המספרה סגורה ביום זה</p>";
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

loadAppointments();