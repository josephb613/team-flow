import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, priority, status, impactScope, impactDays, impactCost, decision } = body;

    const statusChangesDecision = status === 'approved' || status === 'rejected';

    const changeRequest = await db.changeRequest.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(impactScope !== undefined && { impactScope }),
        ...(impactDays !== undefined && { impactDays }),
        ...(impactCost !== undefined && { impactCost }),
        ...(decision !== undefined && { decision }),
        ...(statusChangesDecision && { decidedAt: new Date() }),
      },
      include: { requestedBy: true, project: true },
    });

    return NextResponse.json(changeRequest);
  } catch (error) {
    console.error('PATCH /api/change-requests/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update change request' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.changeRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/change-requests/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete change request' }, { status: 500 });
  }
}
