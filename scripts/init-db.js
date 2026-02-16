// scripts/init-db.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Проверяем подключение
    await prisma.$connect();
    console.log('Database connected successfully');

    // СОЗДАЕМ ТАБЛИЦЫ ЧЕРЕЗ RAW SQL, ЕСЛИ ИХ НЕТ
    console.log('Checking if tables exist and creating them if needed...');

    // Создаем таблицу User
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL
      );
    `);
    console.log('✅ Table "User" checked/created');

    // Создаем таблицу LessonProgress
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "LessonProgress" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "lessonId" INTEGER NOT NULL,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "unlocked" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        UNIQUE("userId", "lessonId")
      );
    `);
    console.log('✅ Table "LessonProgress" checked/created');

    // Создаем индексы
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "LessonProgress_userId_idx" ON "LessonProgress"("userId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "LessonProgress_lessonId_idx" ON "LessonProgress"("lessonId");
    `);
    console.log('✅ Indexes checked/created');

    // Добавляем внешний ключ (с проверкой, что его нет)
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'LessonProgress_userId_fkey'
        ) THEN
          ALTER TABLE "LessonProgress" 
          ADD CONSTRAINT "LessonProgress_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✅ Foreign key checked/created');

    // Теперь проверяем, есть ли пользователи
    const userCount = await prisma.user.count();
    console.log(`👥 Users in database: ${userCount}`);

    // Если нет пользователей, создаём тестового (опционально)
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
      console.log('✅ Admin user created (email: admin@example.com, password: admin123)');
    }

    console.log('🎉 Database initialization completed successfully!');

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initDatabase();
