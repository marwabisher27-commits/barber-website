import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const errorBox = document.getElementById("loginError");

async function adminLogin() {
    try {
        await signInWithEmailAndPassword(
            auth,
            emailInput.value,
            passwordInput.value
        );

        localStorage.setItem("adminLoggedIn", "true");
        location.href = "admin.html";
    } catch (error) {
        errorBox.textContent = "אימייל או סיסמה שגויים";
    }
}

window.adminLogin = adminLogin;