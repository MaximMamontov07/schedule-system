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

// PUT - обновление занятия
export async function PUT(request, { params }) {
  try {
    const user = checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const db = await getDb();
    const { id } = await params;
    const body = await request.json();
    const { group_id, teacher_id, subject_id, pair_number, day_of_week } = body;

    if (!group_id || !teacher_id || !subject_id || !pair_number || !day_of_week) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    const query = `
      UPDATE schedule 
      SET group_id = $1, teacher_id = $2, subject_id = $3, pair_number = $4, day_of_week = $5 
      WHERE id = $6
    `;
    
    await db.query(query, [
      parseInt(group_id), 
      parseInt(teacher_id), 
      parseInt(subject_id), 
      parseInt(pair_number), 
      parseInt(day_of_week), 
      parseInt(id)
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка PUT:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// DELETE - удаление занятия
export async function DELETE(request, { params }) {
  try {
    const user = checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Доступ запрещен' }, { status: 403 });
    }

    const db = await getDb();
    const { id } = await params;
    
    await db.query('DELETE FROM schedule WHERE id = $1', [parseInt(id)]);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка DELETE:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}