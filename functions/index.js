/* eslint-disable no-console */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Usa la MISMA región en el frontend: getFunctions(app, 'us-central1')
const REGION = "us-central1";

const db = admin.firestore();

/** Determina si quien llama es admin (custom claim o rol en Firestore). */
async function isAdminContext(context) {
  // Sin auth
  if (!context || !context.auth || !context.auth.uid) return false;

  // 1) Custom claim
  const token = context.auth.token || {};
  if (token.admin === true) return true;

  // 2) Rol en Firestore /users/{uid}.role === 'admin'
  try {
    const me = await db.collection("users").doc(context.auth.uid).get();
    return me.exists && me.data() && me.data().role === "admin";
  } catch (e) {
    console.error("isAdminContext -> error leyendo users/", context.auth.uid, e);
    return false;
  }
}

/**
 * Trigger Auth: al crear un usuario en Authentication,
 * crea/actualiza el espejo en Firestore /users/{uid}.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const email = user.email || "";
  const displayName = user.displayName || "";
  const phoneNumber = user.phoneNumber || "";

  // Si ya viene con claim admin => rol admin; de lo contrario 'user'
  const full = await admin.auth().getUser(uid);
  const claims = full.customClaims || {};
  const role = claims.admin === true ? "admin" : "user";

  const ref = db.collection("users").doc(uid);
  const payload = {
    uid: uid,
    email: email,
    name: displayName,
    phone: phoneNumber,
    role: role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await ref.set(payload, { merge: true });
  console.log("onUserCreate -> espejo creado:", uid, role);
  return true;
});

/**
 * Callable: crea un usuario en Auth + espejo en Firestore,
 * sin cambiar la sesión de quien llama.
 * data: { name, role, email, phone, password }
 */
exports.createUserAccount = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    const adminOk = await isAdminContext(context);
    if (!adminOk) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores."
      );
    }

    const name = data && data.name;
    const role = data && data.role;
    const email = data && data.email;
    const phone = data && data.phone;
    const password = data && data.password;

    if (!name || !email || !password) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Faltan campos obligatorios (name, email, password)."
      );
    }

    // Crea usuario en Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      phoneNumber: phone || undefined,
      disabled: false,
    });

    // Asigna custom claim si corresponde
    const makeAdmin = role === "admin";
    if (makeAdmin) {
      await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    }

    // Espejo en Firestore
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set(
        {
          uid: userRecord.uid,
          name: name,
          role: makeAdmin ? "admin" : "user",
          email: email,
          phone: phone || "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log("createUserAccount -> creado:", userRecord.uid, role);
    return { uid: userRecord.uid };
  });

/**
 * Callable: borra usuario en Auth + su doc en Firestore.
 * data: { uid }
 */
exports.deleteAuthUser = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    const adminOk = await isAdminContext(context);
    if (!adminOk) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores."
      );
    }

    const uid = data && data.uid;
    if (!uid) {
      throw new functions.https.HttpsError("invalid-argument", "Falta uid.");
    }

    // Borra en Auth (ignora si no existe)
    try {
      await admin.auth().deleteUser(uid);
    } catch (e) {
      console.warn("deleteAuthUser -> deleteUser warning:", e && e.message ? e.message : e);
    }

    // Borra espejo en Firestore (ignora si no existe)
    try {
      await db.collection("users").doc(uid).delete();
    } catch (e) {
      console.warn("deleteAuthUser -> delete doc warning:", e && e.message ? e.message : e);
    }

    console.log("deleteAuthUser -> ok:", uid);
    return { ok: true };
  });

/**
 * Callable: sincroniza todos los usuarios de Auth hacia Firestore
 * creando documentos faltantes en /users.
 */
exports.backfillUsersToFirestore = functions
  .region(REGION)
  .https.onCall(async (_data, context) => {
    const adminOk = await isAdminContext(context);
    if (!adminOk) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Solo administradores."
      );
    }

    async function ensureDoc(u) {
      const ref = db.collection("users").doc(u.uid);
      const snap = await ref.get();
      if (snap.exists) return false;

      const customClaims = u.customClaims || {};
      const role = customClaims.admin ? "admin" : "user";
      await ref.set(
        {
          uid: u.uid,
          name: u.displayName || "",
          role: role,
          email: u.email || "",
          phone: u.phoneNumber || "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return true;
    }

    let nextPageToken = undefined;
    let created = 0;

    do {
      const res = await admin.auth().listUsers(1000, nextPageToken);
      for (let i = 0; i < res.users.length; i++) {
        const u = res.users[i];
        try {
          const made = await ensureDoc(u);
          if (made) created++;
        } catch (e) {
          console.warn("backfill -> fallo con uid", u.uid, e && e.message ? e.message : e);
        }
      }
      nextPageToken = res.pageToken;
    } while (nextPageToken);

    console.log("backfillUsersToFirestore -> creados:", created);
    return { ok: true, created: created };
  });
