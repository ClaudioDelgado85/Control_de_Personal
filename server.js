require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Connection Setup
const uri = process.env.MONGODB_URI;
let dbClient;
let controlDb;

async function connectDB() {
    try {
        dbClient = new MongoClient(uri);
        await dbClient.connect();
        controlDb = dbClient.db("control_personal_db");
        console.log("✅ Successfully connected to MongoDB Atlas!");
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from the project root

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Leer credenciales desde las variables de entorno
    const validUser = process.env.ADMIN_USER || 'admin';
    const validPass = process.env.ADMIN_PASS || 'admin123';

    if (username === validUser && password === validPass) {
        res.json({ success: true, token: 'fake-jwt-token' });
    } else {
        res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
    }
});

// --- New MongoDB API Endpoints ---

// GET: Fetch all data from MongoDB
app.get('/api/data', async (req, res) => {
    try {
        if (!controlDb) return res.status(500).json({ error: 'Database not connected' });
        
        // Fetch all 3 collections. If empty, return default empty arrays.
        const empleados = await controlDb.collection('empleados').find({}).toArray();
        const actividades = await controlDb.collection('actividades').find({}).toArray();
        const registros = await controlDb.collection('registros').find({}).toArray();
        
        res.json({ 
            empleados: empleados.map(e => e.name), 
            actividades: actividades.map(a => a.name), 
            registros: registros 
        });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: 'Error reading from database' });
    }
});

// POST: Save/Update data to MongoDB
app.post('/api/data', async (req, res) => {
    try {
        if (!controlDb) return res.status(500).json({ error: 'Database not connected' });
        const { empleados, actividades, registros } = req.body;
        
        if (empleados) {
            await controlDb.collection('empleados').deleteMany({});
            if (empleados.length > 0) {
                const empDocs = empleados.map(name => ({ name }));
                await controlDb.collection('empleados').insertMany(empDocs);
            }
        }
        
        if (actividades) {
            await controlDb.collection('actividades').deleteMany({});
            if (actividades.length > 0) {
                const actDocs = actividades.map(name => ({ name }));
                await controlDb.collection('actividades').insertMany(actDocs);
            }
        }
        
        if (registros) {
            await controlDb.collection('registros').deleteMany({});
            if (registros.length > 0) {
                await controlDb.collection('registros').insertMany(registros);
            }
        }

        res.json({ success: true, message: 'Datos guardados exitosamente en MongoDB.' });
    } catch (error) {
        console.error("Error saving data:", error);
        res.status(500).json({ error: 'Error writing to database' });
    }
});

// Initialize DB and then start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running accurately on http://localhost:${PORT}`);
    });
});
