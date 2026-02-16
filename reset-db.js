// backend/reset-db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

async function resetDatabase() {
  try {
    console.log('Resetting database...');

    // Удаляем все записи
    await prisma.lessonProgress.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('All records deleted');

    // Создаем тестового пользователя
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@test.com',
        password: hashedPassword
      }
    });

    console.log('Test user created:', user);

    // Загружаем модули из JSON
    const modulesPath = path.join(__dirname, 'data', 'modules.json');
    const modulesData = JSON.parse(fs.readFileSync(modulesPath, 'utf8'));

    // Создаем прогресс для первого урока
    if (modulesData.modules.length > 0) {
      const firstModule = modulesData.modules[0];
      if (firstModule.lessons.length > 0) {
        const progress = await prisma.lessonProgress.create({
          data: {
            userId: user.id,
            lessonId: firstModule.lessons[0].id,
            completed: false,
            unlocked: true
          }
        });
        console.log('Initial progress created:', progress);
      }
    }

    console.log('Database reset complete!');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();