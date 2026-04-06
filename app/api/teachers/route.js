export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function checkAuth(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return null;
    const token = authHeader.split(' ')[1];
    if (token && token.length > 0) return { role: 'admin' };
    return null;
  } catch (error) {
    return null;
  }
}

// GET - получение всех преподавателей
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM teachers ORDER BY name');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Ошибка GET teachers:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - добавление преподавателя
export async function POST(request) {
  try {
    const user = checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const db = await getDb();
    const body = await request.json();
    const { name } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Имя преподавателя обязательно' }, { status: 400 });
    }

    try {
      await db.query('INSERT INTO teachers (name) VALUES ($1)', [name.trim()]);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Такой преподаватель уже существует' }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Ошибка POST teachers:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - удаление преподавателя
export async function DELETE(request) {
  try {
    const user = checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID преподавателя обязателен' }, { status: 400 });
    }

    await db.query('DELETE FROM teachers WHERE id = $1', [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE teachers:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}