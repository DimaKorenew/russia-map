import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Recipe {
  id: string;
  name: string;
  url: string;
}

interface RegionRecipes {
  recipes: Recipe[];
}

interface RecipesData {
  regions: {
    [key: string]: RegionRecipes;
  };
}

// Функция для генерации ID из названия
const generateId = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

// Функция для конвертации CSV в JSON
const convertCsvToJson = () => {
  const csvFilePath = path.resolve(__dirname, '../data/recipes.csv');
  const jsonFilePath = path.resolve(__dirname, '../data/recipes.json');

  try {
    // Читаем CSV файл
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });

    // Парсим CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Группируем рецепты по регионам
    const recipesData: RecipesData = {
      regions: {}
    };

    records.forEach((record: any) => {
      // Получаем значения по позиции ключей
      const keys = Object.keys(record);
      const region = record[keys[0]];
      const recipeName = record[keys[1]];
      const url = record[keys[2]];

      if (!region || !recipeName || !url) {
        console.error('Пропущены обязательные поля:', { region, recipeName, url });
        return;
      }

      if (!recipesData.regions[region]) {
        recipesData.regions[region] = { recipes: [] };
      }

      recipesData.regions[region].recipes.push({
        id: generateId(recipeName),
        name: recipeName,
        url: url
      });
    });

    // Записываем JSON файл
    fs.writeFileSync(
      jsonFilePath,
      JSON.stringify(recipesData, null, 2),
      { encoding: 'utf-8' }
    );

    console.log('CSV успешно конвертирован в JSON!');
    console.log(`Обработано регионов: ${Object.keys(recipesData.regions).length}`);
    console.log(`Всего рецептов: ${Object.values(recipesData.regions).reduce((sum, region) => sum + region.recipes.length, 0)}`);
  } catch (error) {
    console.error('Ошибка при конвертации:', error);
    process.exit(1);
  }
};

// Запускаем конвертацию
convertCsvToJson(); 