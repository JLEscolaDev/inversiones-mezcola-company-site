import { NextResponse } from 'next/server';

function sanitize(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim();
}

export async function POST(request: Request) {
  const data = await request.formData();

  const locale = sanitize(data.get('locale')) || 'es';
  const source = sanitize(data.get('source')) || 'cinematic-site';
  const name = sanitize(data.get('name'));
  const company = sanitize(data.get('company'));
  const email = sanitize(data.get('email'));
  const message = sanitize(data.get('message'));

  if (!name || !email || !message) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    captured: {
      locale,
      source,
      name,
      company,
      email,
      message,
      receivedAt: new Date().toISOString(),
    },
  });
}
