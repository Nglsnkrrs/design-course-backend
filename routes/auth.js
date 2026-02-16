// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Загружаем модули из JSON файла с обработкой ошибок
const modulesPath = path.join(__dirname, '../data/modules.json');
let modulesData = { modules: [] };

try {
  if (fs.existsSync(modulesPath)) {
    const data = fs.readFileSync(modulesPath, 'utf8');
    modulesData = JSON.parse(data);
    console.log('Modules loaded successfully in auth:', modulesData.modules.length);
  } else {
    console.error('Modules file not found at:', modulesPath);
  }
} catch (error) {
  console.error('Error loading modules.json in auth:', error);
}

// Регистрация
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  console.log('Registration attempt:', { name, email });

  try {
    // Проверяем, существует ли пользователь
    const userExists = await prisma.user.findUnique({
      where: { email }
    });

    if (userExists) {
      return res.status(400).json({ msg: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    console.log('User created:', user.id);

    // Создаем начальный прогресс для первого урока
    if (modulesData.modules && modulesData.modules.length > 0) {
      const firstModule = modulesData.modules[0];
      if (firstModule && firstModule.lessons && firstModule.lessons[0]) {
        await prisma.lessonProgress.create({
          data: {
            userId: user.id,
            lessonId: firstModule.lessons[0].id,
            completed: false,
            unlocked: true
          }
        });
        console.log('Initial progress created for user:', user.id);
      }
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Логин
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log('Login attempt:', { email });

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(400).json({ msg: 'Пользователь не найден' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Неверные данные' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });

    console.log('User logged in:', user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;