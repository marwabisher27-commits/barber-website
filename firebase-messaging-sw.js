importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyCvrOjGFHX-kF6t7tsjWielMQ7UZ8ptXFo",
    authDomain: "barber-website-ece01.firebaseapp.com",
    projectId: "barber-website-ece01",
    storageBucket: "barber-website-ece01.firebasestorage.app",
    messagingSenderId: "90920663626",
    appId: "1:90920663626:web:5be4a5377bc9004b30c4b3"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: "images/logo.png"
    });
});