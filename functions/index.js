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