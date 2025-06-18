const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onUserCreate = functions.auth.user().onCreate((user) => {
  const uid = user.uid;
  const email = user.email || "";
  const displayName = user.displayName || "";
  const phoneNumber = user.phoneNumber || "";

  return admin.firestore().collection("users").doc(uid).set({
    uid: uid,
    email: email,
    name: displayName,
    phone: phoneNumber,
    role: "user",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
