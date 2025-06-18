// users/script.js

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

// Configuración de Cloudinary
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dplgx0sze/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "hacienda-la-violeta";
const CLOUDINARY_API_KEY = "836231553993721";   // tu api_key pública
// (la api_secret se queda SOLO en el servidor)


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
    console.log("Usuario autenticado:", user.email);
    loadUsers();
    loadObjects();
  }
});

/**
 * Sube una imagen a Cloudinary usando firma generada por el backend
 */
async function uploadImage(file) {
  // 1) Preparo el timestamp y pido la firma al servidor
  const timestamp = Math.floor(Date.now() / 1000);
  const sigRes = await fetch("http://localhost:3000/get-signature", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      params_to_sign: {
        timestamp,
        upload_preset: CLOUDINARY_UPLOAD_PRESET
      }
    })
  });
  const { signature } = await sigRes.json();

  // 2) Construyo el FormData con todos los campos obligatorios
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", CLOUDINARY_API_KEY);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  // 3) Subo a Cloudinary
  try {
    const res = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return data.secure_url;
  } catch (err) {
    console.error("Error al subir imagen:", err);
    return null;
  }
}

// Agregar un nuevo objeto perdido
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
    const uploadedUrl = await uploadImage(imageFile);
    if (uploadedUrl) imageUrl = uploadedUrl;
  }

  try {
    await addDoc(collection(db, "objects"), {
      name,
      date,
      description,
      location,
      imageUrl
    });
    alert("Objeto agregado correctamente.");
    document.getElementById("add-object-form").reset();
    loadObjects();
  } catch (err) {
    console.error("Error al agregar objeto:", err);
    alert("No fue posible agregar el objeto.");
  }
}

// Cargar y renderizar objetos
async function loadObjects() {
  const tbody = document.getElementById("objects-table-body");
  tbody.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "objects"));
    let idx = 1;
    snap.forEach(docSnap => {
      const o = docSnap.data();
      tbody.innerHTML += `
        <tr>
          <td>${idx++}</td>
          <td>${o.name}</td>
          <td>${o.date}</td>
          <td>${o.description}</td>
          <td>${o.location}</td>
          <td><img src="${o.imageUrl}" alt="${o.name}"></td>
          <td>
            <button onclick="deleteObject('${docSnap.id}')">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>`;
    });
  } catch (err) {
    console.error("Error al cargar objetos:", err);
  }
}

// Eliminar un objeto
async function deleteObject(id) {
  if (!confirm("¿Eliminar este objeto?")) return;
  try {
    await deleteDoc(doc(db, "objects", id));
    loadObjects();
  } catch (err) {
    console.error("Error al eliminar objeto:", err);
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
      uid: cred.user.uid,
      name,
      role,
      email,
      phone
    });
    alert("Usuario agregado correctamente.");
    document.getElementById("add-user-form").reset();
    loadUsers();
  } catch (err) {
    console.error("Error al crear usuario:", err);
    alert("No fue posible crear el usuario.");
  }
}

// Cargar usuarios en tabla
async function loadUsers() {
  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "users"));
    let idx = 1;
    snap.forEach(docSnap => {
      const u = docSnap.data();
      tbody.innerHTML += `
        <tr>
          <td>${idx++}</td>
          <td>${u.name}</td>
          <td>${u.role}</td>
          <td>${u.email}</td>
          <td>${u.phone}</td>
        </tr>`;
    });
  } catch (err) {
    console.error("Error al cargar usuarios:", err);
  }
}

// Manejo de pestañas
function switchTab(tab) {
  document.querySelectorAll('section').forEach(s => s.style.display = 'none');
  document.getElementById(`${tab}-tab`).style.display = 'block';
  document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.tabs button[data-tab="${tab}"]`).classList.add('active');
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("add-user-form")?.addEventListener("submit", addUser);
  document.getElementById("add-object-form")?.addEventListener("submit", addObject);
  document.querySelectorAll('.tabs button').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
  switchTab("user");
});

// Exponer funciones en el scope global
window.addUser      = addUser;
window.addObject    = addObject;
window.loadUsers    = loadUsers;
window.loadObjects  = loadObjects;
window.deleteObject = deleteObject;
