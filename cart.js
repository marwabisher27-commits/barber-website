const cartItemsContainer = document.getElementById("cart-items");
const totalElement = document.getElementById("cart-total");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function showCart() {
    cartItemsContainer.innerHTML = "";
    let total = 0;

    const groupedCart = [];

    cart.forEach(function(product) {
        const existingProduct = groupedCart.find(function(item) {
            return item.name === product.name;
        });

        if (existingProduct) {
            existingProduct.quantity++;
        } else {
            groupedCart.push({
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }
    });

    groupedCart.forEach(function(product) {
        const priceNumber = Number(product.price.replace("₪", ""));
        total += priceNumber * product.quantity;

        cartItemsContainer.innerHTML += `
            <div class="cart-item">
                <img src="${product.image}">

                <div class="cart-info">
                    <h3>${product.name}</h3>
                    <p>${product.price}</p>
                </div>

                <div class="qty">
                    <button onclick="changeQty('${product.name}', -1)">−</button>
                    <span>${product.quantity}</span>
                    <button onclick="changeQty('${product.name}', 1)">+</button>
                </div>
            </div>
        `;
    });

    totalElement.textContent = "₪" + total;
}

function changeQty(productName, change) {
    if (change === 1) {
        const product = cart.find(function(item) {
            return item.name === productName;
        });

        if (product) {
            cart.push(product);
        }
    } else {
        const index = cart.findIndex(function(item) {
            return item.name === productName;
        });

        if (index !== -1) {
            cart.splice(index, 1);
        }
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    showCart();
}
function clearCart() {
    showConfirmMessage("האם למחוק את כל המוצרים מהסל?");
}
function showConfirmMessage(text) {
    const box = document.createElement("div");
    box.className = "confirm-box";

    box.innerHTML = `
        <p>${text}</p>
        <div class="confirm-buttons">
            <button onclick="confirmClearCart()">כן</button>
            <button onclick="this.closest('.confirm-box').remove()">לא</button>
        </div>
    `;

    document.body.appendChild(box);
}

function confirmClearCart() {
    cart = [];
    localStorage.setItem("cart", JSON.stringify(cart));
    showCart();

    document.querySelector(".confirm-box").remove();
    showMessage("הסל רוקן בהצלחה");
}
showCart();