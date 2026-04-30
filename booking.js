const daysGrid = document.getElementById("daysGrid");
const timesGrid = document.getElementById("timesGrid");

const serviceSelect = document.getElementById("serviceSelect");
const customerName = document.getElementById("customerName");
const customerPhone = document.getElementById("customerPhone");

let selectedDay = "";
let selectedTime = "";

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
    button.innerHTML = `${dayName}<br>${dateText}`;

    if (workingHours[dayName] === null) {
        button.classList.add("closed");
        button.innerHTML = `${dayName}<br>${dateText}<br>סגור`;
        button.disabled = true;
    }

    button.addEventListener("click", function() {
        selectedDay = dayName + " " + dateText;
        selectedTime = "";

        document.querySelectorAll(".day-card").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        showTimes(dayName);
    });

    daysGrid.appendChild(button);
}
function showTimes(day) {
    timesGrid.innerHTML = "";

    const hours = workingHours[day];

    if (!hours) {
        timesGrid.innerHTML = "<p>המספרה סגורה ביום זה</p>";
        return;
    }

    const times = createTimes(hours[0], hours[1]);

    times.forEach(function(time) {
        const button = document.createElement("button");
        button.className = "time-card";
        button.textContent = time;

        button.addEventListener("click", function() {
            selectedTime = time;

            document.querySelectorAll(".time-card").forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
        });

        timesGrid.appendChild(button);
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

        let time =
            String(hour).padStart(2, "0") +
            ":" +
            String(minute).padStart(2, "0");

        result.push(time);
        current += 30;
    }

    return result;
}

function confirmBooking() {
    if (serviceSelect.value === "" || selectedDay === "" || selectedTime === "" || customerName.value === "" || customerPhone.value === "") {
        showMessage("נא למלא את כל הפרטים");
        return;
    }

    if (!/^[0-9]{10}$/.test(customerPhone.value)) {
        showMessage("מספר טלפון חייב להיות 10 ספרות");
        return;
    }

    showMessage("התור נקבע בהצלחה");
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