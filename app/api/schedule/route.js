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

// GET - получение расписания
export async function GET(request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    let query = `
      SELECT 
        s.*,
        g.name as group_name,
        t.name as teacher_name,
        sub.name as subject_name
      FROM schedule s
      JOIN groups g ON s.group_id = g.id
      JOIN teachers t ON s.teacher_id = t.id
      JOIN subjects sub ON s.subject_id = sub.id
    `;
    let params = [];

    if (groupId) {
      query += ' WHERE s.group_id = $1';
      params.push(parseInt(groupId));
    }

    query += ' ORDER BY s.day_of_week, s.pair_number';
    
    const result = await db.query(query, params);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Ошибка GET:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST - добавление занятия
export async function POST(request) {
  try {
    const user = checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const db = await getDb();
    const body = await request.json();
    
    const { group_id, teacher_id, subject_id, pair_number, day_of_week } = body;

    // Валидация
    if (!group_id || !teacher_id || !subject_id || !pair_number || !day_of_week) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    const pairNum = parseInt(pair_number);
    const dayNum = parseInt(day_of_week);

    if (pairNum < 1 || pairNum > 6) {
      return NextResponse.json({ error: 'Номер пары должен быть от 1 до 6' }, { status: 400 });
    }

    if (dayNum < 1 || dayNum > 6) {
      return NextResponse.json({ error: 'День недели должен быть от 1 до 6' }, { status: 400 });
    }

    const query = `
      INSERT INTO schedule (group_id, teacher_id, subject_id, pair_number, day_of_week) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    const result = await db.query(query, [
      parseInt(group_id), 
      parseInt(teacher_id), 
      parseInt(subject_id), 
      pairNum, 
      dayNum
    ]);

    return NextResponse.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Ошибка POST:', error);
    return NextResponse.json({ error: 'Ошибка сервера: ' + error.message }, { status: 500 });
  }
}

// DELETE - удаление занятия
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
      return NextResponse.json({ error: 'ID занятия обязателен' }, { status: 400 });
    }

    await db.query('DELETE FROM schedule WHERE id = $1', [parseInt(id)]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}