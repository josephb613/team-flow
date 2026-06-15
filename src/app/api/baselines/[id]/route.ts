import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const baseline = await db.baseline.findUnique({
      where: { id },
      include: { project: { select: { id: true, name: true, color: true, icon: true } } },
    });
    if (!baseline) {
      return NextResponse.json({ error: 'Baseline not found' }, { status: 404 });
    }
    return NextResponse.json(baseline);
  } catch (error) {
    console.error('GET /api/baselines/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch baseline' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.baseline.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/baselines/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete baseline' }, { status: 500 });
  }
}
