// routes/modules.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Путь к файлу с модулями
const modulesPath = path.join(__dirname, '../data/modules.json');

// Получить все модули
router.get('/', (req, res) => {
  try {
    console.log('Fetching modules from:', modulesPath);

    // Проверяем, существует ли файл
    if (!fs.existsSync(modulesPath)) {
      console.error('Modules file not found at:', modulesPath);
      return res.status(404).json({ error: 'Modules file not found' });
    }

    const data = fs.readFileSync(modulesPath, 'utf8');
    const modulesData = JSON.parse(data);
    console.log('Modules loaded successfully');
    res.json(modulesData);
  } catch (error) {
    console.error('Error reading modules:', error);
    res.status(500).json({ error: 'Failed to load modules' });
  }
});

// Получить конкретный модуль по ID
router.get('/:id', (req, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    console.log('Fetching module:', moduleId);

    const data = fs.readFileSync(modulesPath, 'utf8');
    const modulesData = JSON.parse(data);

    const module = modulesData.modules.find(m => m.id === moduleId);

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json(module);
  } catch (error) {
    console.error('Error reading module:', error);
    res.status(500).json({ error: 'Failed to load module' });
  }
});

module.exports = router;