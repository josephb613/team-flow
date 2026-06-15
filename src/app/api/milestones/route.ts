import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, projectId, dueDate, status, color } = body;

    if (!title?.trim() || !projectId) {
      return NextResponse.json({ error: 'Title and project are required' }, { status: 400 });
    }

    const milestone = await db.milestone.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        projectId,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || 'upcoming',
        color: color || '#10b981',
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create milestone' }, { status: 500 });
  }
}
