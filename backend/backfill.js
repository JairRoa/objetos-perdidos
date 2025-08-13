/* backfill.js */
const admin = require("firebase-admin");

// Fuerza usar el proyecto correcto
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "objetosperdidos-76abd"
});

const db = admin.firestore();

async function ensureDoc(u) {
  const ref = db.collection("users").doc(u.uid);
  const snap = await ref.get();
  if (snap.exists) return false;
  const role = u.customClaims && u.customClaims.admin ? "admin" : "user";
  await ref.set({
    uid: u.uid,
    name: u.displayName || "",
    role,
    email: u.email || "",
    phone: u.phoneNumber || "",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  return true;
}

(async () => {
  console.log("Using project:", admin.app().options.projectId);
  let created = 0, nextPageToken = undefined;
  do {
    const page = await admin.auth().listUsers(1000, nextPageToken);
    for (const u of page.users) {
      try { if (await ensureDoc(u)) created++; }
      catch (e) { console.error("UID", u.uid, e.message); }
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);
  console.log("Backfill listo. Creados:", created);
  process.exit(0);
})();
