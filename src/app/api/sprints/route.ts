import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, goal, projectId, startDate, endDate, status } = body;

    if (!name?.trim() || !projectId) {
      return NextResponse.json({ error: 'Name and project are required' }, { status: 400 });
    }

    const sprint = await db.sprint.create({
      data: {
        name: name.trim(),
        goal: goal?.trim() || null,
        projectId,
        status: status || 'planning',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json(sprint, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create sprint' }, { status: 500 });
  }
}
