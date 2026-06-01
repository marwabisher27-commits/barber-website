const { setGlobalOptions } = require("firebase-functions");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

exports.sendBookingNotification = onDocumentCreated(
    "appointments/{appointmentId}",
    async (event) => {
        const appointment = event.data.data();

        const tokensSnap = await admin.firestore()
            .collection("adminTokens")
            .get();

        if (tokensSnap.empty) {
            console.log("No admin tokens found");
            return;
        }

        const tokens = [];

        tokensSnap.forEach((doc) => {
            const data = doc.data();
            if (data.token) {
                tokens.push(data.token);
            }
        });

        if (tokens.length === 0) {
            console.log("No valid tokens");
            return;
        }

        const message = {
            notification: {
                title: "תור חדש",
                body: `${appointment.name} קבע/ה תור ל-${appointment.day} בשעה ${appointment.time}`
            },
            webpush: {
                notification: {
                    icon: "/images/logo.png",
                    badge: "/images/logo.png"
                }
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        console.log("Notifications sent:", response.successCount);
        console.log("Notifications failed:", response.failureCount);
    }
);