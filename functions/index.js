const { setGlobalOptions } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");
process.env.TZ = "Asia/Jerusalem";
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


const { defineSecret } = require("firebase-functions/params");

const TELEGRAM_BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = defineSecret("TELEGRAM_CHAT_ID");

exports.sendTelegramBooking = onDocumentCreated(
    {
        document: "appointments/{appointmentId}",
        secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID]
    },
    async (event) => {
        const appointment = event.data.data();

        const text =
`🔔 תור חדש

שם: ${appointment.name}
טלפון: ${appointment.phone}
שירות: ${appointment.service}
יום: ${appointment.day}
שעה: ${appointment.time}`;

        const token = TELEGRAM_BOT_TOKEN.value();
        const chatId = TELEGRAM_CHAT_ID.value();

        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text
            })
        });

        console.log("Telegram message sent");
    }
);
exports.sendTelegramCancel = onDocumentCreated(
    {
        document: "notifications/{notificationId}",
        secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID]
    },
    async (event) => {
        const data = event.data.data();

        if (data.type !== "cancel_booking") {
            return;
        }

        const text =
`❌ ביטול תור

שם: ${data.name || "לא ידוע"}
טלפון: ${data.phone || ""}
שירות: ${data.service || ""}
יום: ${data.day}
שעה: ${data.time}`;

        const token = TELEGRAM_BOT_TOKEN.value();
        const chatId = TELEGRAM_CHAT_ID.value();

        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text
            })
        });

        console.log("Telegram cancel message sent");
    }
);
exports.sendTelegramReminders = onSchedule(
    {
        schedule: "every 5 minutes",
        timeZone: "Asia/Jerusalem",
        secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID]
    },
    async () => {
        const now = new Date();
        const reminderStart = new Date(now.getTime() + 25 * 60 * 1000);
        const reminderEnd = new Date(now.getTime() + 35 * 60 * 1000);

        const snap = await admin.firestore()
            .collection("appointments")
            .get();

        const token = TELEGRAM_BOT_TOKEN.value();
        const chatId = TELEGRAM_CHAT_ID.value();

        for (const docSnap of snap.docs) {
            const appointment = docSnap.data();

            if (appointment.reminderSent === true) continue;
            if (!appointment.day || !appointment.time) continue;

            const datePart = appointment.day.split(" ")[1];
            if (!datePart) continue;

            const [day, month] = datePart.split("/").map(Number);
            const [hour, minute] = appointment.time.split(":").map(Number);

            const appointmentDate = new Date(
                now.getFullYear(),
                month - 1,
                day,
                hour,
                minute,
                0,
                0
            );

            if (appointmentDate <= now) {
                await docSnap.ref.set({ reminderSent: true }, { merge: true });
                continue;
            }

            if (appointmentDate >= reminderStart && appointmentDate <= reminderEnd) {
                const text =
`⏰ תזכורת תור

בעוד כחצי שעה יש תור:

שם: ${appointment.name}
טלפון: ${appointment.phone || ""}
שירות: ${appointment.service}
יום: ${appointment.day}
שעה: ${appointment.time}`;

                const url = `https://api.telegram.org/bot${token}/sendMessage`;

                await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: text
                    })
                });

                await docSnap.ref.set({
                    reminderSent: true
                }, { merge: true });

                console.log("Telegram reminder sent");
            }
        }
    }
);