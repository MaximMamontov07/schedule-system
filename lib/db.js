import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';

// Определяем путь к базе данных
let dbPath;
if (process.env.RENDER) {
  // На Render используем persistent disk
  const dataDir = '/var/data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = path.join(dataDir, 'database.db');
} else {
  // Локальная разработка
  dbPath = path.join(process.cwd(), 'database.db');
}

console.log(`Database path: ${dbPath}`);

const db = new sqlite3.Database(dbPath);

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));
const dbExec = promisify(db.exec.bind(db));

export async function getDb() {
  // Создаем таблицу групп
  await dbExec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Создаем таблицу преподавателей
  await dbExec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Создаем таблицу предметов
  await dbExec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Создаем таблицу расписания
  await dbExec(`
    CREATE TABLE IF NOT EXISTS schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      teacher_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      pair_number INTEGER NOT NULL CHECK(pair_number >= 1 AND pair_number <= 6),
      day_of_week INTEGER NOT NULL CHECK(day_of_week >= 1 AND day_of_week <= 6),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )
  `);
  
  // Добавляем тестовые данные если таблицы пустые
  const groupCount = await dbGet('SELECT COUNT(*) as count FROM groups');
  if (groupCount.count === 0) {
    console.log('Добавление тестовых данных...');
    await dbRun("INSERT INTO groups (name) VALUES ('ПС-31')");
    await dbRun("INSERT INTO groups (name) VALUES ('ИС-42')");
    await dbRun("INSERT INTO teachers (name) VALUES ('Иванов А.А.')");
    await dbRun("INSERT INTO teachers (name) VALUES ('Петрова Е.М.')");
    await dbRun("INSERT INTO subjects (name) VALUES ('Программирование')");
    await dbRun("INSERT INTO subjects (name) VALUES ('Базы данных')");
  }
  
  return {
    all: (sql, params = []) => dbAll(sql, params),
    get: (sql, params = []) => dbGet(sql, params),
    run: (sql, params = []) => dbRun(sql, params)
  };
}