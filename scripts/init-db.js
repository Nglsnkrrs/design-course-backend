// scripts/init-db.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Создаем папку для базы данных, если её нет
    const dbDir = path.join(__dirname, '..', 'db');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('Created db directory');
    }

    // Проверяем подключение к базе
    await prisma.$connect();
    console.log('Database connected successfully');

    // Создаем тестового пользователя (если нужно)
    const userCount = await prisma.user.count();
    console.log(`Users in database: ${userCount}`);

    // Если база пустая, можно создать администратора
    if (userCount === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@example.com',
          password: hashedPassword
        }
      });
      console.log('Admin user created');
    }

  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();
