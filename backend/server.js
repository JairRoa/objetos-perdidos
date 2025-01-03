const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Configura Cloudinary
cloudinary.config({
    cloud_name: 'dplgx0sze', // Cloud Name
    api_key: '836231553993721', // API Key
    api_secret: 'OGUmUi1FzdtkFMnYqEmBajX-_bc', // API Secret
});

// Ruta para generar firma
app.post('/get-signature', (req, res) => {
    const { params_to_sign } = req.body;

    const signature = cloudinary.utils.api_sign_request(params_to_sign, cloudinary.config().api_secret);

    res.json({ signature });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
