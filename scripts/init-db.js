// scripts/init-db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Проверяем подключение
    await prisma.$connect();
    console.log('Database connected successfully');

    // Проверяем, есть ли пользователи
    const userCount = await prisma.user.count();
    console.log(`Users in database: ${userCount}`);

    // Если нет пользователей, можно создать тестового
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
