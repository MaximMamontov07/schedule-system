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

// GET - получение всех групп
export async function GET() {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM groups ORDER BY name');
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Ошибка GET groups:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - добавление группы
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
      return NextResponse.json({ error: 'Название группы обязательно' }, { status: 400 });
    }

    try {
      await db.query('INSERT INTO groups (name) VALUES ($1)', [name.trim()]);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        return NextResponse.json({ error: 'Такая группа уже существует' }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Ошибка POST groups:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - удаление группы
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
      return NextResponse.json({ error: 'ID группы обязателен' }, { status: 400 });
    }

    await db.query('DELETE FROM groups WHERE id = $1', [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE groups:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}