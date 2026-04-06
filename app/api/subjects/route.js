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

// GET - получение всех предметов
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM subjects ORDER BY name');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Ошибка GET subjects:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - добавление предмета
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
      return NextResponse.json({ error: 'Название предмета обязательно' }, { status: 400 });
    }

    try {
      await db.query('INSERT INTO subjects (name) VALUES ($1)', [name.trim()]);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Такой предмет уже существует' }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Ошибка POST subjects:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - удаление предмета
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
      return NextResponse.json({ error: 'ID предмета обязателен' }, { status: 400 });
    }

    await db.query('DELETE FROM subjects WHERE id = $1', [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE subjects:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}