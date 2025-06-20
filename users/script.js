// users/script.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Config Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBrh5AP2ErXaQAcZb0NMHq_5cBrvNZIlWo",
  authDomain: "objetosperdidos-76abd.firebaseapp.com",
  projectId: "objetosperdidos-76abd",
  storageBucket: "objetosperdidos-76abd.firebasestorage.app",
  messagingSenderId: "609690831592",
  appId: "1:609690831592:web:f7a276b069c426ef53175d",
  measurementId: "G-95C30B5EK1"
};

// Cloudinary config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dplgx0sze/image/upload";
const CLOUDINARY_PRESET = "hacienda-la-violeta";
const CLOUDINARY_API_KEY = "836231553993721";

// Firebase init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Autenticación
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("No estás autenticado. Inicia sesión.");
    window.location.href = "../store/admin.html";
  } else {
    loadUsers();
    loadObjects();
  }
});

// Upload seguro a Cloudinary
async function uploadImage(file) {
  const timestamp = Math.floor(Date.now() / 1000);
  const res = await fetch("http://localhost:3000/get-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      params_to_sign: {
        timestamp,
        upload_preset: CLOUDINARY_PRESET
      }
    })
  });
  const { signature } = await res.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("upload_preset", CLOUDINARY_PRESET);

  const uploadRes = await fetch(CLOUDINARY_URL, {
    method: "POST",
    body: formData
  });

  const data = await uploadRes.json();
  return data.secure_url || null;
}

// Crear nuevo objeto
async function addObject(event) {
  event.preventDefault();

  const name = document.getElementById("object-name").value.trim();
  const date = document.getElementById("object-date").value;
  const description = document.getElementById("object-description").value.trim();
  const location = document.getElementById("object-location").value.trim();
  const imageFile = document.getElementById("object-image").files[0];

  if (!name || !date || !description || !location) {
    return alert("Todos los campos son obligatorios.");
  }

  let imageUrl = "https://via.placeholder.com/150";
  if (imageFile) {
    const url = await uploadImage(imageFile);
    if (url) imageUrl = url;
  }

  try {
    await addDoc(collection(db, "objects"), {
      name, date, description, location, imageUrl
    });
    alert("Objeto agregado.");
    document.getElementById("add-object-form").reset();
    loadObjects();
  } catch (err) {
    console.error("Error al guardar objeto:", err);
    alert("No fue posible guardar.");
  }
}

// Eliminar objeto
async function deleteObject(id) {
  if (!confirm("¿Eliminar este objeto?")) return;
  try {
    await deleteDoc(doc(db, "objects", id));
    loadObjects();
  } catch (err) {
    console.error("Error al eliminar:", err);
  }
}

// Cargar lista de objetos
async function loadObjects() {
  const tbody = document.getElementById("objects-table-body");
  tbody.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "objects"));
    let i = 1;
    snap.forEach(docSnap => {
      const obj = docSnap.data();
      tbody.innerHTML += `
        <tr>
          <td>${i++}</td>
          <td>${obj.name}</td>
          <td>${obj.date}</td>
          <td>${obj.description}</td>
          <td>${obj.location}</td>
          <td><img src="${obj.imageUrl}" alt="${obj.name}" /></td>
          <td>
            <button onclick="deleteObject('${docSnap.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Error al cargar objetos:", err);
  }
}

// Agregar usuario nuevo
async function addUser(event) {
  event.preventDefault();

  const name = document.getElementById("user-name").value.trim();
  const role = document.getElementById("user-role").value;
  const email = document.getElementById("user-email").value.trim();
  const phone = document.getElementById("user-phone").value.trim();
  const pwd = document.getElementById("user-password").value;
  const pwd2 = document.getElementById("confirm-password").value;

  if (!name || !role || !email || !phone || !pwd || !pwd2) {
    return alert("Todos los campos son obligatorios.");
  }
  if (pwd !== pwd2) {
    return alert("Las contraseñas no coinciden.");
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pwd);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid, name, role, email, phone
    });
    alert("Usuario agregado.");
    document.getElementById("add-user-form").reset();
    loadUsers();
  } catch (err) {
    console.error("Error creando usuario:", err);
    alert("No fue posible crear el usuario.");
  }
}

// Cargar lista de usuarios
async function loadUsers() {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "users"));
    let i = 1;
    snap.forEach(docSnap => {
      const user = docSnap.data();
      tbody.innerHTML += `
        <tr>
          <td>${i++}</td>
          <td>${user.name}</td>
          <td>${user.role}</td>
          <td>${user.email}</td>
          <td>${user.phone}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Error al cargar usuarios:", err);
  }
}

// Activar pestañas y eventos
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-user-form")?.addEventListener("submit", addUser);
  document.getElementById("add-object-form")?.addEventListener("submit", addObject);
  document.querySelectorAll(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
      document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
      document.getElementById(`${tab}-tab`).classList.add("active");
      btn.classList.add("active");
    });
  });
});

// Exponer funciones globalmente
window.deleteObject = deleteObject;
