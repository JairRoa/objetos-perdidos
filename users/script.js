// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBgIheO2RtRC55SVBCkZfomoElB2Lu1UVY",
    authDomain: "hacienda-la-violeta.firebaseapp.com",
    projectId: "hacienda-la-violeta",
    storageBucket: "hacienda-la-violeta.appspot.com",
    messagingSenderId: "892026900805",
    appId: "1:892026900805:web:47453888b443aa6681ee2c",
    measurementId: "G-EPJL0ZKWP3"
};

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dplgx0sze/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'hacienda-la-violeta';

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentEditingUserId = null; // Variable para rastrear al usuario que se está editando

// Verificar autenticación antes de cargar datos
function checkAuthentication(callback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuario autenticado:", user);
            callback();
        } else {
            alert("No estás autenticado. Por favor inicia sesión.");
            window.location.href = "../admin.html"; // Redirige a la página de inicio de sesión
        }
    });
}

// Switch tabs
function switchTab(tab) {
    document.querySelectorAll('section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    const selectedTab = document.getElementById(`${tab}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
    }

    document.querySelectorAll('.tabs button').forEach(button => {
        button.classList.remove('active');
    });

    document.querySelector(`.tabs button[data-tab="${tab}"]`).classList.add('active');
}

// Add user
async function addUser(event) {
    event.preventDefault();

    if (currentEditingUserId) {
        updateUser(event);
        return;
    }

    const name = document.getElementById("user-name").value;
    const email = document.getElementById("user-email").value;
    const phone = document.getElementById("user-phone").value;
    const password = document.getElementById("user-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name,
            email,
            phone
        });

        alert("Usuario creado correctamente.");
        document.getElementById("add-user-form").reset();
        loadUsers(); // Reload user list
    } catch (error) {
        console.error("Error al crear usuario:", error);
        alert("Error al crear el usuario: " + error.message);
    }
}

// Edit user
function populateUserForm(userId) {
    const docRef = doc(db, "users", userId);
    getDoc(docRef).then(docSnap => {
        if (docSnap.exists()) {
            const user = docSnap.data();
            document.getElementById("user-name").value = user.name;
            document.getElementById("user-email").value = user.email;
            document.getElementById("user-phone").value = user.phone;

            const passwordField = document.getElementById("user-password");
            const confirmPasswordField = document.getElementById("confirm-password");
            if (passwordField && confirmPasswordField) {
                passwordField.style.display = 'none';
                passwordField.required = false;
                confirmPasswordField.style.display = 'none';
                confirmPasswordField.required = false;
            }

            const addButton = document.getElementById("add-user-button");
            const updateButton = document.getElementById("update-user-button");
            if (addButton && updateButton) {
                addButton.style.display = 'none';
                updateButton.style.display = 'block';
            }

            currentEditingUserId = userId;
        } else {
            alert("Usuario no encontrado.");
        }
    }).catch(error => {
        console.error("Error al cargar usuario:", error);
    });
}

async function updateUser(event) {
    event.preventDefault();

    if (!currentEditingUserId) {
        alert("No hay usuario seleccionado para actualizar.");
        return;
    }

    const name = document.getElementById("user-name").value;
    const email = document.getElementById("user-email").value;
    const phone = document.getElementById("user-phone").value;

    try {
        await updateDoc(doc(db, "users", currentEditingUserId), {
            name,
            email,
            phone
        });

        alert("Usuario actualizado correctamente.");
        document.getElementById("add-user-form").reset();

        const passwordField = document.getElementById("user-password");
        const confirmPasswordField = document.getElementById("confirm-password");
        if (passwordField && confirmPasswordField) {
            passwordField.style.display = 'block';
            passwordField.required = true;
            confirmPasswordField.style.display = 'block';
            confirmPasswordField.required = true;
        }

        const addButton = document.getElementById("add-user-button");
        const updateButton = document.getElementById("update-user-button");
        if (addButton && updateButton) {
            addButton.style.display = 'block';
            updateButton.style.display = 'none';
        }

        currentEditingUserId = null;
        loadUsers();
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        alert("Error al actualizar usuario: " + error.message);
    }
}

// Delete user
async function deleteUser(userId) {
    try {
        await deleteDoc(doc(db, "users", userId));
        alert("Usuario eliminado correctamente.");
        loadUsers();
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        alert("Error al eliminar usuario: " + error.message);
    }
}

// Load users
async function loadUsers() {
    const usersTableBody = document.getElementById("users-table-body");
    if (!usersTableBody) {
        console.error("El elemento users-table-body no existe en el DOM.");
        return;
    }

    usersTableBody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let index = 1;
        querySnapshot.forEach(doc => {
            const user = doc.data();
            const row = `
                <tr>
                    <td>${index++}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
                    <td>
                        <button onclick="populateUserForm('${doc.id}')">Editar</button>
                        <button onclick="deleteUser('${doc.id}')">Eliminar</button>
                    </td>
                </tr>`;
            usersTableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error al cargar usuarios:", error);
        alert("Error al cargar usuarios: " + error.message);
    }
}

// Load products
async function loadProducts() {
    const productsTableBody = document.getElementById("products-table-body");
    if (!productsTableBody) {
        console.error("El elemento products-table-body no existe en el DOM.");
        return;
    }

    productsTableBody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        let index = 1;
        querySnapshot.forEach(doc => {
            const product = doc.data();
            const row = `
                <tr>
                    <td>${index++}</td>
                    <td>${product.name}</td>
                    <td>${product.weight}</td>
                    <td>$${product.price}</td>
                    <td>${product.quantity}</td>
                    <td>
                        <button onclick="populateProductForm('${doc.id}')">Editar</button>
                        <button onclick="deleteProduct('${doc.id}')">Eliminar</button>
                    </td>
                </tr>`;
            productsTableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error al cargar productos:", error);
        alert("Error al cargar productos: " + error.message);
    }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
    const addUserForm = document.getElementById("add-user-form");
    const updateUserButton = document.getElementById("update-user-button");

    if (addUserForm) {
        addUserForm.addEventListener("submit", addUser);
    } else {
        console.error("El formulario add-user-form no existe en el DOM.");
    }

    if (updateUserButton) {
        updateUserButton.addEventListener("click", updateUser);
    } else {
        console.error("El botón update-user-button no existe en el DOM.");
    }

    checkAuthentication(() => {
        loadUsers();
        loadProducts();
    });

    document.querySelectorAll('.tabs button').forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.getAttribute('data-tab');
            switchTab(tab);
        });
    });

    switchTab("user");
});

// Exponer funciones globalmente
window.populateUserForm = populateUserForm;
window.updateUser = updateUser;
window.deleteUser = deleteUser;
window.loadProducts = loadProducts;
