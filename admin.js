import { db, collection, doc, deleteDoc } from "./firebase.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

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

            times.forEach(function(time) {
                const appointment = allAppointments.find(function(app) {
                    return app.day === fullDay && app.time === time;
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

                dayBox.appendChild(slot);
            });
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
    const ok = confirm("לבטל את התור הזה?");
    if (!ok) return;

    const slotId = day.replaceAll(" ", "_").replaceAll("/", "-") + "_" + time.replace(":", "-");

    await deleteDoc(doc(db, "appointments", appointmentId));
    await deleteDoc(doc(db, "bookedSlots", slotId));

    alert("התור בוטל בהצלחה");
    loadAppointments();
}

window.adminCancelBooking = adminCancelBooking;

loadAppointments();