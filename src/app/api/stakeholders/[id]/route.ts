import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, organization, role, email, phone, website, logo, influence, interest, engagement, strategy } = body;

    const stakeholder = await db.stakeholder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(organization !== undefined && { organization }),
        ...(role !== undefined && { role }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(logo !== undefined && { logo: logo?.trim() || null }),
        ...(influence !== undefined && { influence }),
        ...(interest !== undefined && { interest }),
        ...(engagement !== undefined && { engagement }),
        ...(strategy !== undefined && { strategy }),
      },
      include: { project: true },
    });

    return NextResponse.json(stakeholder);
  } catch (error) {
    console.error('PATCH /api/stakeholders/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update stakeholder' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.stakeholder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/stakeholders/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete stakeholder' }, { status: 500 });
  }
}
