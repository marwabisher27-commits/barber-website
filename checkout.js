const deliveryMethod = document.getElementById("deliveryMethod");
const deliveryPrice = document.getElementById("deliveryPrice");
const finalPrice = document.getElementById("finalPrice");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

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

    finalPrice.textContent = "סה״כ לתשלום: ₪" + total;
}

deliveryMethod.addEventListener("change", calculateTotal);

calculateTotal();
const checkoutForm = document.querySelector(".checkout-form");

checkoutForm.addEventListener("submit", function(event) {
    event.preventDefault();

    localStorage.removeItem("cart");

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