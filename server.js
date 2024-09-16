/*const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Endpoint para manejar el envío de correos
app.post('/send-email', (req, res) => {
    const { name, lastname, phone, company, email, country } = req.body;

    // Configuración del transportador de nodemailer
    let transporter = nodemailer.createTransport({
        service: 'gmail', // Cambiado a 'gmail' en lugar de 'Gmail'
        auth: {
            user: 'onexdigitalpremium@gmail.com', // Tu correo electrónico
            pass: 'Caca1996.' // Tu contraseña de aplicación si tienes autenticación en dos pasos
        }
    });

    // Configuración del correo
    let mailOptions = {
        from: 'tu-correo@gmail.com',
        to: 'onexdigitalpremium@gmail.com',
        subject: 'Nuevo mensaje de contacto',
        text: `Nombre: ${name}\nApellido: ${lastname}\nTeléfono: ${phone}\nEmpresa: ${company}\nEmail: ${email}\nPaís: ${country}`
    };

    // Enviar correo
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error al enviar el correo:', error);
            return res.status(500).send('Error al enviar el correo');
        }
        res.status(200).send('Correo enviado exitosamente');
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
*/