const deliveryMethod = document.getElementById("deliveryMethod");
const deliveryPrice = document.getElementById("deliveryPrice");
const finalPrice = document.getElementById("finalPrice");
const appointmentBox = document.getElementById("appointmentBox");

let cart = JSON.parse(localStorage.getItem("cart")) || [];
const appointment = JSON.parse(localStorage.getItem("appointment"));

let appointmentPrice = 0;

if (appointment) {
    if (appointment.service.includes("מבוגרים")) appointmentPrice = 70;
    if (appointment.service.includes("ילדים")) appointmentPrice = 30;
    if (appointment.service.includes("זקן")) appointmentPrice = 20;
    if (appointment.service.includes("5 תספורות מבוגרים")) appointmentPrice = 320;
    else if (appointment.service.includes("5 תספורות ילדים")) appointmentPrice = 120;

    appointmentBox.innerHTML = `
        <p>התור שנבחר: ${appointment.service}</p>
        <p>${appointment.day} | ${appointment.time}</p>
        <label>
            <input type="checkbox" id="includeAppointment">
            לכלול את מחיר התור בתשלום
        </label>
    `;
}

function calculateTotal() {
    let total = 0;

    cart.forEach(function(product) {
        const price = Number(product.price.replace("₪", ""));
        total += price;
    });

    if (deliveryMethod.value === "delivery") {
        total += 20;
        deliveryPrice.textContent = "עלות משלוח: ₪20";
    } else {
        deliveryPrice.textContent = "עלות משלוח: ₪0";
    }

    const includeAppointment = document.getElementById("includeAppointment");

    if (includeAppointment && includeAppointment.checked) {
        total += appointmentPrice;
    }

    finalPrice.textContent = "סה״כ לתשלום: ₪" + total;
}

deliveryMethod.addEventListener("change", calculateTotal);

document.addEventListener("change", function(e) {
    if (e.target.id === "includeAppointment") {
        calculateTotal();
    }
});

calculateTotal();

const checkoutForm = document.querySelector(".checkout-form");

checkoutForm.addEventListener("submit", function(event) {
    event.preventDefault();

    localStorage.removeItem("cart");
    localStorage.removeItem("appointment");

    showMessage("ההזמנה התקבלה בהצלחה");

    setTimeout(function() {
        location.href = "thankyou.html";
    }, 1800);
});

function showMessage(text) {
    const message = document.createElement("div");
    message.className = "toast-message";
    message.textContent = text;

    document.body.appendChild(message);

    setTimeout(function() {
        message.remove();
    }, 1800);
}