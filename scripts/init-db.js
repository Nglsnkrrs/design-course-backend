// scripts/init-db.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    const isProduction = process.env.NODE_ENV === 'production';
    const dbDir = isProduction ? '/tmp' : path.join(__dirname, '..', 'db');
    
    console.log('Database directory:', dbDir);
    
    // В продакшене /tmp всегда доступна
    if (!isProduction) {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log('Created db directory');
      }
    }

    // Проверяем подключение к базе
    await prisma.$connect();
    console.log('Database connected successfully');

    const userCount = await prisma.user.count();
    console.log(`Users in database: ${userCount}`);

  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();
