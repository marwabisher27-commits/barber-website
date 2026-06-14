const { setGlobalOptions } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

async function getAdminTokens() {
    const tokensSnap = await admin.firestore()
        .collection("adminTokens")
        .get();

    const tokens = [];

    tokensSnap.forEach((doc) => {
        const data = doc.data();
        if (data.token) {
            tokens.push(data.token);
        }
    });

    return tokens;
}

async function sendPush(title, body) {
    const tokens = await getAdminTokens();

    if (tokens.length === 0) {
        console.log("No admin tokens found");
        return;
    }

    const message = {
        notification: {
            title: title,
            body: body
        },
        webpush: {
            notification: {
                icon: "/images/logo.png",
                badge: "/images/logo.png"
            },
            fcmOptions: {
                link: "https://marwabisher27-commits.github.io/barber-website/admin.html"
            },
            headers: {
                Urgency: "high"
            }
        },
        tokens: tokens
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    console.log("Notifications sent:", response.successCount);
    console.log("Notifications failed:", response.failureCount);
}

exports.sendBookingNotification = onDocumentCreated(
    "appointments/{appointmentId}",
    async (event) => {
        const appointment = event.data.data();

        await sendPush(
            "תור חדש",
            `${appointment.name} קבע  תור ל-${appointment.day} בשעה ${appointment.time}`
        );
    }
);

exports.sendGeneralNotification = onDocumentCreated(
    "notifications/{notificationId}",
    async (event) => {
        const data = event.data.data();

        await sendPush(
            data.title || "עדכון חדש",
            data.message || ""
        );
    }
);
const TELEGRAM_BOT_TOKEN = "8858442740:AAHONbqZB5T1U10KP1N3vfCVoZOI47Yu1UE";
const TELEGRAM_CHAT_ID = "5644640617";

exports.sendTelegramBooking = onDocumentCreated(
    "appointments/{appointmentId}",
    async (event) => {
        const appointment = event.data.data();

        const text =
`🔔 תור חדש

שם: ${appointment.name}
טלפון: ${appointment.phone}
שירות: ${appointment.service}
יום: ${appointment.day}
שעה: ${appointment.time}`;

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

        await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: text
            })
        });

        console.log("Telegram message sent");
    }
);