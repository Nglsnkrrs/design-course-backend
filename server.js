// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const modulesRoutes = require('./routes/modules');

const app = express();

// Настройка CORS для продакшена
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL,

].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Логирование
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Проверка папок
const materialsDir = path.join(__dirname, 'public', 'materials');
if (!fs.existsSync(materialsDir)) {
  fs.mkdirSync(materialsDir, { recursive: true });
}

// Статические файлы
app.use('/materials', express.static(materialsDir));
app.use('/data', express.static(path.join(__dirname, 'data')));

// API эндпоинты
app.use('/api/auth', authRoutes);
app.use('/api', progressRoutes);
app.use('/api/modules', modulesRoutes);

// Проверка работоспособности
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Materials directory: ${materialsDir}`);
});