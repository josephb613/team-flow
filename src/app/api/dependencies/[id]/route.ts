import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.taskDependency.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/dependencies/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete dependency' }, { status: 500 });
  }
}
