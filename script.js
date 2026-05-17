const buttons = document.querySelectorAll(".add-to-cart");
const cartCountElement = document.getElementById("cart-count");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

updateCartCount();

buttons.forEach(function(button) {
    button.addEventListener("click", function() {
        const card = button.closest(".product-card");

        const product = {
            name: card.querySelector("h3").textContent,
            price: card.querySelector(".price").textContent,
            image: card.querySelector("img").getAttribute("src")
        };

        cart.push(product);
        localStorage.setItem("cart", JSON.stringify(cart));

        updateCartCount();
        showMessage("המוצר נוסף לסל");
    });
});

function updateCartCount() {
    if (cartCountElement) {
        cartCountElement.textContent = cart.length;
    }
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