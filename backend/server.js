// script.js

// Importar módulos de Firebase (v11 modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Configuración de Firebase (app “objetosperdidos-76abd”)
const firebaseConfig = {
  apiKey: "AIzaSyBrh5AP2ErXaQcZbDNMHPq_5cBrvNZI1lW0",
  authDomain: "objetosperdidos-76abd.firebaseapp.com",
  projectId: "objetosperdidos-76abd",
  storageBucket: "objetosperdidos-76abd.appspot.com",
  messagingSenderId: "609690831592",
  appId: "1:609690831592:web:2d2e3158d1f3874453175d",
  measurementId: "G-011BZDH0HB"
};

// URL de tu backend que firma las peticiones
const SIGN_API_URL = "http://localhost:3000/get-signature";
// Preset que configuraste en Cloudinary
const UPLOAD_PRESET = "hacienda-la-violeta";

// Inicializar Firebase y servicios
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Verifica usuario antes de mostrar el panel
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("No estás autenticado. Inicia sesión.");
    window.location.href = "../store/admin.html";
  } else {
    loadUsers();
    loadObjects();
  }
});

/**
 * Sube una imagen a Cloudinary usando tu endpoint de firma
 */
async function uploadImage(file) {
  // Pedimos firma al servidor
  const res = await fetch(SIGN_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // puedes enviar public_id o folder si los quieres
      upload_preset: UPLOAD_PRESET
    })
  });
  const { signature, timestamp, api_key, cloud_name } = await res.json();

  // Construimos FormData con todos los campos requeridos
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", api_key);
  form.append("timestamp", timestamp);
  form.append("signature", signature);
  form.append("upload_preset", UPLOAD_PRESET);

  // Subimos a Cloudinary
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
  const uploadRes = await fetch(uploadUrl, { method: "POST", body: form });
  const data = await uploadRes.json();
  return data.secure_url;
}

// —————— RESTO DE LA LÓGICA ——————

// Agregar un nuevo objeto perdido
async function addObject(e) {
  e.preventDefault();

  const name        = document.getElementById("object-name").value.trim();
  const date        = document.getElementById("object-date").value;
  const desc        = document.getElementById("object-description").value.trim();
  const loc         = document.getElementById("object-location").value.trim();
  const file        = document.getElementById("object-image").files[0];

  if (!name || !date || !desc || !loc) {
    return alert("Todos los campos son obligatorios.");
  }

  let imageUrl = "https://via.placeholder.com/150";
  if (file) {
    imageUrl = await uploadImage(file) || imageUrl;
  }

  try {
    await addDoc(collection(db, "objects"), { name, date, description: desc, location: loc, imageUrl });
    alert("Objeto agregado correctamente.");
    document.getElementById("add-object-form").reset();
    loadObjects();
  } catch {
    alert("No fue posible agregar el objeto.");
  }
}

// Cargar y renderizar objetos
async function loadObjects() {
  const tbody = document.getElementById("objects-table-body");
  tbody.innerHTML = "";
  const snap = await getDocs(collection(db, "objects"));
  let i = 1;
  snap.forEach(d => {
    const o = d.data();
    tbody.innerHTML += `
      <tr>
        <td>${i++}</td>
        <td>${o.name}</td>
        <td>${o.date}</td>
        <td>${o.description}</td>
        <td>${o.location}</td>
        <td><img src="${o.imageUrl}" alt="${o.name}"></td>
        <td>
          <button onclick="deleteObject('${d.id}')">
            <i class="fas fa-trash-alt"></i>
          </button>
        </td>
      </tr>`;
  });
}

// Eliminar un objeto
async function deleteObject(id) {
  if (!confirm("¿Eliminar este objeto?")) return;
  await deleteDoc(doc(db, "objects", id));
  loadObjects();
}

// Agregar usuario nuevo
async function addUser(e) {
  e.preventDefault();
  const name  = document.getElementById("user-name").value.trim();
  const role  = document.getElementById("user-role").value;
  const email = document.getElementById("user-email").value.trim();
  const phone = document.getElementById("user-phone").value.trim();
  const pwd   = document.getElementById("user-password").value;
  const pwd2  = document.getElementById("confirm-password").value;

  if (!name||!role||!email||!phone||!pwd||!pwd2)
    return alert("Todos los campos son obligatorios.");
  if (pwd !== pwd2)
    return alert("Las contraseñas no coinciden.");

  const cred = await createUserWithEmailAndPassword(auth, email, pwd);
  await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, name, role, email, phone });
  alert("Usuario agregado correctamente.");
  document.getElementById("add-user-form").reset();
  loadUsers();
}

// Cargar usuarios
async function loadUsers() {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";
  const snap = await getDocs(collection(db, "users"));
  let i = 1;
  snap.forEach(d => {
    const u = d.data();
    tbody.innerHTML += `
      <tr>
        <td>${i++}</td>
        <td>${u.name}</td>
        <td>${u.role}</td>
        <td>${u.email}</td>
        <td>${u.phone}</td>
      </tr>`;
  });
}

// Pestañas y eventos
function switchTab(t) {
  document.querySelectorAll("section").forEach(s => s.classList.remove("active"));
  document.getElementById(`${t}-tab`).classList.add("active");
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tabs button[data-tab="${t}"]`).classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-user-form")?.addEventListener("submit", addUser);
  document.getElementById("add-object-form")?.addEventListener("submit", addObject);
  document.querySelectorAll(".tabs button")
          .forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  switchTab("user");
});

// Hacer las funciones accesibles desde el HTML
window.deleteObject = deleteObject;
window.switchTab   = switchTab;
