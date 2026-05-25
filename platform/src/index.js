const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const generateRoute = require('./routes/generate');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
app.use(express.json());

// Routes
app.use('/api/generate', generateRoute);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', platform: '44gen' });
});

app.listen(PORT, () => {
    console.log(`44gen platform running on port ${PORT}`);
});
