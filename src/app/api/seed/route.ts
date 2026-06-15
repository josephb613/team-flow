import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error:
        'Le seed de démonstration est désactivé. Créez un compte via la page d\'inscription.',
    },
    { status: 403 }
  );
}
