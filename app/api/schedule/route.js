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
      query += ' WHERE s.group_id = ?';
      params.push(groupId);
    }

    query += ' ORDER BY s.day_of_week, s.pair_number';
    
    const schedule = await db.all(query, params);
    
    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Ошибка:', error);
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
    const { group_id, teacher_id, subject_id, pair_number, day_of_week } = await request.json();

    if (!group_id || !teacher_id || !subject_id || !pair_number || !day_of_week) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    if (pair_number < 1 || pair_number > 6) {
      return NextResponse.json({ error: 'Номер пары должен быть от 1 до 6' }, { status: 400 });
    }

    if (day_of_week < 1 || day_of_week > 6) {
      return NextResponse.json({ error: 'День недели должен быть от 1 до 6' }, { status: 400 });
    }

    await db.run(
      `INSERT INTO schedule (group_id, teacher_id, subject_id, pair_number, day_of_week) 
       VALUES (?, ?, ?, ?, ?)`,
      [group_id, teacher_id, subject_id, pair_number, day_of_week]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}