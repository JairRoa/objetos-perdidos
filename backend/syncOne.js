const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "objetosperdidos-76abd"
});

const db = admin.firestore();
const UID = process.argv[2];

if (!UID) {
  console.error("Uso: node backend/syncOne.js <UID>");
  process.exit(1);
}

(async () => {
  console.log("Using project:", admin.app().options.projectId);
  const u = await admin.auth().getUser(UID);
  const role = (u.customClaims && u.customClaims.admin) ? "admin" : "user";
  await db.collection("users").doc(UID).set({
    uid: u.uid,
    name: u.displayName || "",
    role,
    email: u.email || "",
    phone: u.phoneNumber || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log("Sincronizado:", UID, u.email, "role:", role);
  process.exit(0);
})();
