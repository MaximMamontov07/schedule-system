import pg from 'pg';
const { Pool } = pg;

let pool = null;

export async function getDb() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // Создаем таблицы
    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        pair_number INTEGER NOT NULL CHECK(pair_number >= 1 AND pair_number <= 6),
        day_of_week INTEGER NOT NULL CHECK(day_of_week >= 1 AND day_of_week <= 6),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Добавляем тестовые данные если таблицы пустые
    const result = await pool.query('SELECT COUNT(*) as count FROM groups');
    if (parseInt(result.rows[0].count) === 0) {
      console.log('Добавление тестовых данных...');
      await pool.query("INSERT INTO groups (name) VALUES ('ПС-31')");
      await pool.query("INSERT INTO groups (name) VALUES ('ИС-42')");
      await pool.query("INSERT INTO teachers (name) VALUES ('Иванов А.А.')");
      await pool.query("INSERT INTO teachers (name) VALUES ('Петрова Е.М.')");
      await pool.query("INSERT INTO subjects (name) VALUES ('Программирование')");
      await pool.query("INSERT INTO subjects (name) VALUES ('Базы данных')");
    }
  }
  
  return {
    query: (text, params) => pool.query(text, params),
    all: async (text, params) => {
      const result = await pool.query(text, params);
      return result.rows;
    },
    get: async (text, params) => {
      const result = await pool.query(text, params);
      return result.rows[0];
    },
    run: async (text, params) => {
      const result = await pool.query(text, params);
      return result;
    }
  };
}