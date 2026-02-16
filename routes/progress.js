// backend/routes/progress.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// Загружаем модули из JSON файла
const modulesPath = path.join(__dirname, '../data/modules.json');
let modulesData = { modules: [] };

try {
  if (fs.existsSync(modulesPath)) {
    const data = fs.readFileSync(modulesPath, 'utf8');
    modulesData = JSON.parse(data);
    console.log('Progress routes: modules loaded:', modulesData.modules.length);
  } else {
    console.error('Modules file not found at:', modulesPath);
  }
} catch (error) {
  console.error('Error loading modules.json:', error);
}

// Получить весь прогресс пользователя
router.get('/progress', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Getting progress for user:', userId);

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const progress = await prisma.lessonProgress.findMany({
      where: { userId }
    });

    console.log('Found progress:', progress.length);
    res.json(progress);
  } catch (error) {
    console.error('Error in /progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Отметить урок как завершенный
router.post('/progress/complete', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { lessonId } = req.body;

    console.log('Completing lesson:', { userId, lessonId });

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Находим урок в JSON
    let currentLesson = null;
    let nextLesson = null;
    let currentModule = null;

    for (const module of modulesData.modules) {
      const lessonIndex = module.lessons.findIndex(l => l.id === lessonId);
      if (lessonIndex !== -1) {
        currentLesson = module.lessons[lessonIndex];
        nextLesson = module.lessons[lessonIndex + 1];
        currentModule = module;
        break;
      }
    }

    if (!currentLesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Отмечаем текущий урок как завершенный
    const completedProgress = await prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      update: {
        completed: true,
        unlocked: true
      },
      create: {
        userId,
        lessonId,
        completed: true,
        unlocked: true
      }
    });

    console.log('Completed lesson:', completedProgress);

    // Если есть следующий урок, разблокируем его
    if (nextLesson) {
      await prisma.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId: nextLesson.id
          }
        },
        update: {
          unlocked: true
        },
        create: {
          userId,
          lessonId: nextLesson.id,
          completed: false,
          unlocked: true
        }
      });
      console.log('Unlocked next lesson:', nextLesson.id);
    }

    // Проверяем, все ли уроки текущего модуля пройдены
    if (currentModule) {
      const allLessonsInModule = currentModule.lessons.map(l => l.id);
      const completedLessons = await prisma.lessonProgress.findMany({
        where: {
          userId,
          lessonId: { in: allLessonsInModule },
          completed: true
        }
      });

      // Если все уроки модуля пройдены, проверяем следующий модуль
      if (completedLessons.length === allLessonsInModule.length) {
        console.log('All lessons in module completed, checking next module');

        // Находим следующий модуль
        const currentModuleIndex = modulesData.modules.findIndex(m =>
          m.lessons.some(l => l.id === lessonId)
        );
        const nextModule = modulesData.modules[currentModuleIndex + 1];

        if (nextModule) {
          // Разблокируем первый урок следующего модуля
          const firstLessonOfNextModule = nextModule.lessons[0];
          if (firstLessonOfNextModule) {
            await prisma.lessonProgress.upsert({
              where: {
                userId_lessonId: {
                  userId,
                  lessonId: firstLessonOfNextModule.id
                }
              },
              update: {
                unlocked: true
              },
              create: {
                userId,
                lessonId: firstLessonOfNextModule.id,
                completed: false,
                unlocked: true
              }
            });
            console.log('Unlocked first lesson of next module:', firstLessonOfNextModule.id);
          }
        }
      }
    }

    res.json({
      success: true,
      completed: completedProgress,
      nextLesson: nextLesson || null
    });
  } catch (error) {
    console.error('Error in /progress/complete:', error);
    res.status(500).json({ error: error.message });
  }
});

// Инициализировать прогресс для нового пользователя
router.post('/progress/init', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Initializing progress for user:', userId);

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем, есть ли уже прогресс у пользователя
    const existingProgress = await prisma.lessonProgress.findFirst({
      where: { userId }
    });

    if (existingProgress) {
      console.log('Progress already exists');
      return res.json({ message: 'Progress already exists' });
    }

    // Создаем прогресс для первого урока первого модуля
    if (modulesData.modules && modulesData.modules.length > 0) {
      const firstModule = modulesData.modules[0];
      if (firstModule && firstModule.lessons && firstModule.lessons[0]) {
        const progress = await prisma.lessonProgress.create({
          data: {
            userId,
            lessonId: firstModule.lessons[0].id,
            completed: false,
            unlocked: true
          }
        });
        console.log('Created initial progress:', progress);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in /progress/init:', error);
    res.status(500).json({ error: error.message });
  }
});
// Эндпоинт для проверки существования файлов материалов
router.get('/check-file/:filename', (req, res) => {
  const filename = req.params.filename;
  // Путь к папке с материалами (относительно корня проекта)
  const filePath = path.join(__dirname, '../public/materials', filename);
  
  console.log('Checking file:', filePath);

  // Проверяем, существует ли файл
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    res.json({
      exists: true,
      size: stats.size,
      sizeFormatted: (stats.size / 1024).toFixed(2) + ' KB',
      filename: filename
    });
  } else {
    res.json({ 
      exists: false,
      filename: filename
    });
  }
});

module.exports = router;
