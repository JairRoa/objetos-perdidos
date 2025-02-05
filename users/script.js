// Importar módulos de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, setDoc, deleteDoc 
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";
import { 
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBgIheO2RtRC55SVBCkZfomoElB2Lu1UVY",
    authDomain: "hacienda-la-violeta.firebaseapp.com",
    projectId: "hacienda-la-violeta",
    storageBucket: "hacienda-la-violeta.appspot.com",
    messagingSenderId: "892026900805",
    appId: "1:892026900805:web:47453888b443aa6681ee2c",
    measurementId: "G-EPJL0ZKWP3"
};

// Configuración de Cloudinary
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dplgx0sze/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "hacienda-la-violeta";

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Verificar autenticación antes de cargar datos
onAuthStateChanged(auth, (user) => {
    if (!user) {
        alert("No estás autenticado. Inicia sesión.");
        window.location.href = "../admin.html";
    } else {
        console.log("Usuario autenticado:", user);
        loadUsers();
        loadProducts();
    }
});

// **Subir imagen a Cloudinary**
async function uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: "POST",
            body: formData
        });

        const data = await response.json();
        return data.secure_url; // Retorna la URL de la imagen subida
    } catch (error) {
        console.error("Error al subir imagen:", error);
        return null;
    }
}

// **Agregar Producto**
async function addProduct(event) {
    event.preventDefault();

    const name = document.getElementById("product-name").value.trim();
    const description = document.getElementById("product-description").value.trim();
    const weightUnit = document.getElementById("product-weight-unit").value.trim();
    const weightValue = document.getElementById("product-weight-value").value.trim();
    const price = document.getElementById("product-price").value.trim();
    const quantity = document.getElementById("product-quantity").value.trim();
    const imageFile = document.getElementById("product-image").files[0]; // Obtener imagen seleccionada

    if (!name || !description || !weightUnit || !weightValue || !price || !quantity) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    let imageUrl = "https://via.placeholder.com/150"; // Imagen por defecto

    if (imageFile) {
        const uploadedImageUrl = await uploadImage(imageFile);
        if (uploadedImageUrl) {
            imageUrl = uploadedImageUrl;
        }
    }

    try {
        await addDoc(collection(db, "products"), { 
            name, 
            description, 
            weight: `${weightValue} ${weightUnit}`, 
            price, 
            quantity,
            imageUrl // Guardar la URL de la imagen en Firestore
        });

        alert("Producto agregado correctamente.");
        document.getElementById("add-product-form").reset();
        loadProducts();
    } catch (error) {
        console.error("Error al agregar producto:", error);
    }
}

// **Cargar Productos**
async function loadProducts() {
    const productsTableBody = document.getElementById("products-table-body");
    productsTableBody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        let index = 1;
        querySnapshot.forEach(docSnap => {
            const product = docSnap.data();
            productsTableBody.innerHTML += `
                <tr>
                    <td>${index++}</td>
                    <td>${product.name}</td>
                    <td>${product.weight}</td>
                    <td>$${product.price}</td>
                    <td>${product.quantity}</td>
                    <td><img src="${product.imageUrl}" alt="${product.name}" width="50"></td>
                    <td><button onclick="deleteProduct('${docSnap.id}')">Eliminar</button></td>
                </tr>`;
        });
    } catch (error) {
        console.error("Error al cargar productos:", error);
    }
}

// **Eliminar Producto**
async function deleteProduct(productId) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    try {
        await deleteDoc(doc(db, "products", productId));
        alert("Producto eliminado.");
        loadProducts();
    } catch (error) {
        console.error("Error al eliminar producto:", error);
    }
}

// **Agregar Usuario**
async function addUser(event) {
    event.preventDefault();

    const name = document.getElementById("user-name").value.trim();
    const email = document.getElementById("user-email").value.trim();
    const phone = document.getElementById("user-phone").value.trim();
    const password = document.getElementById("user-password").value.trim();
    const confirmPassword = document.getElementById("confirm-password").value.trim();

    if (!name || !email || !phone || !password || !confirmPassword) {
        alert("Todos los campos son obligatorios.");
        return;
    }

    if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), { uid: user.uid, name, email, phone });

        alert("Usuario agregado correctamente.");
        document.getElementById("add-user-form").reset();
        loadUsers();
    } catch (error) {
        console.error("Error al agregar usuario:", error);
    }
}

// **Cargar Usuarios**
async function loadUsers() {
    const usersTableBody = document.getElementById("users-table-body");
    usersTableBody.innerHTML = "";

    try {
        const querySnapshot = await getDocs(collection(db, "users"));
        let index = 1;
        querySnapshot.forEach(docSnap => {
            const user = docSnap.data();
            usersTableBody.innerHTML += `
                <tr>
                    <td>${index++}</td>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td>${user.phone}</td>
                </tr>`;
        });
    } catch (error) {
        console.error("Error al cargar usuarios:", error);
    }
}

// **Switch de pestañas**
function switchTab(tab) {
    document.querySelectorAll('section').forEach(section => {
        section.style.display = 'none';
    });

    document.getElementById(`${tab}-tab`).style.display = 'block';

    document.querySelectorAll('.tabs button').forEach(button => {
        button.classList.remove('active');
    });

    document.querySelector(`.tabs button[data-tab="${tab}"]`).classList.add('active');
}

// **Eventos de la Interfaz**
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("add-user-form").addEventListener("submit", addUser);
    document.getElementById("add-product-form").addEventListener("submit", addProduct);

    document.querySelectorAll('.tabs button').forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.getAttribute('data-tab'));
        });
    });

    switchTab("user");
});

// **Exponer funciones globalmente**
window.addUser = addUser;
window.addProduct = addProduct;
window.loadUsers = loadUsers;
window.loadProducts = loadProducts;
window.deleteProduct = deleteProduct;
