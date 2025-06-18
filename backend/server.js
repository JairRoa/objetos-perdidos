// backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();

// Middlwares
app.use(express.json());
app.use(cors());

// Configuración de Cloudinary desde .env
cloudinary.config({
  cloud_name:    process.env.CLOUDINARY_CLOUD_NAME,
  api_key:       process.env.CLOUDINARY_API_KEY,
  api_secret:    process.env.CLOUDINARY_API_SECRET,
});

// Ruta para generar firma de subida
app.post('/get-signature', (req, res) => {
  try {
    // Recibimos los parámetros que quieras firmar (sin timestamp)
    const { public_id, folder, upload_preset } = req.body;
    // Cloudinary exige un timestamp UNIX
    const timestamp = Math.round(Date.now() / 1000);

    // Construimos el objeto con los params a firmar + timestamp
    const paramsToSign = {
      ...(public_id     && { public_id }),
      ...(folder        && { folder }),
      ...(upload_preset && { upload_preset }),
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, cloudinary.config().api_secret);

    // Devolvemos todo lo necesario para el frontend
    return res.json({
      signature,
      timestamp,
      api_key:    cloudinary.config().api_key,
      cloud_name: cloudinary.config().cloud_name,
    });
  } catch (err) {
    console.error("Error al generar la firma:", err);
    return res.status(500).json({ error: "No se pudo generar la firma." });
  }
});

// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
