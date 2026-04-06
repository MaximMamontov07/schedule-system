import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.get('SELECT COUNT(*) as count FROM groups');
    return NextResponse.json({ 
      status: 'healthy', 
      database: 'connected',
      groupsCount: result.count 
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ 
      status: 'unhealthy', 
      error: error.message 
    }, { status: 500 });
  }
}