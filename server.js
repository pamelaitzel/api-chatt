const express = require('express');
const mysql = require('mysql');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const compression = require('compression');
const morgan = require('morgan');

// Crear la aplicación Express
const app = express();

// Crear el servidor HTTP y configurar Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Configurar pool de conexiones a MySQL
const db = mysql.createPool({
    connectionLimit: 10,
    host: 'bfbra5eeuib81qgrygqu-mysql.services.clever-cloud.com',
    user: 'ugbzbtyw6ij3qsyz',
    password: 'ajbM6OaXZB3EdiprMUWK',
    port: 3306,
    database: 'bfbra5eeuib81qgrygqu'
});

// Middleware para compresión de respuestas HTTP
app.use(compression());

// Middleware para logging de solicitudes HTTP
app.use(morgan('dev'));

// Servir archivos estáticos desde la carpeta "from"
app.use(express.static(path.join(__dirname, 'from')));

// Middleware para parsear JSON
app.use(express.json());

// Manejar la conexión de Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado');

    socket.on('sendMessage', (data) => {
        const { username, message } = data;

        if (!username || !message) {
            socket.emit('errorMessage', 'Faltan campos requeridos');
            return;
        }

        const query = 'INSERT INTO messages (username, message) VALUES (?, ?)';
        db.query(query, [username, message], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    console.error('Error al insertar el mensaje en la base de datos: Entrada duplicada');
                    socket.emit('errorMessage', 'Nombre de usuario duplicado');
                } else {
                    console.error('Error al insertar el mensaje en la base de datos:', err.message);
                    socket.emit('errorMessage', 'Error al guardar el mensaje');
                }
                return;
            }
            io.emit('newMessage', { id: result.insertId, username, message });
        });
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

// Ruta de prueba para verificar el funcionamiento de la API
app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

// Manejar todas las rutas no especificadas con el archivo index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'from', 'index.html'));
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Algo salió mal');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
