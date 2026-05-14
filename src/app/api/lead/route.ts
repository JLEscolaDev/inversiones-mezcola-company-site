import { NextResponse } from 'next/server';

function sanitize(value: FormDataEntryValue | null): string {
  return String(value ?? '').trim();
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const ipRequests = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipRequests.get(ip) || []).filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  ipRequests.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

async function sendLeadEmail(payload: {
  locale: string;
  source: string;
  name: string;
  company: string;
  email: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.LEAD_TO_EMAIL;
  const fromEmail = process.env.LEAD_FROM_EMAIL;

  if (!apiKey || !toEmail || !fromEmail) {
    throw new Error('Missing RESEND_API_KEY, LEAD_TO_EMAIL or LEAD_FROM_EMAIL env vars');
  }

  const subject = `Contacto a traves de formulario de inversionesmezcola.es · ${payload.name} · ${payload.company || 'Sin empresa'}`;
  const html = `
    <p><strong>Contacto a traves de formulario de inversionesmezcola.es</strong></p>
    <h2>Nuevo lead recibido</h2>
    <p><strong>Nombre:</strong> ${payload.name}</p>
    <p><strong>Empresa:</strong> ${payload.company || '-'}</p>
    <p><strong>Email:</strong> ${payload.email}</p>
    <p><strong>Idioma:</strong> ${payload.locale}</p>
    <p><strong>Origen:</strong> ${payload.source}</p>
    <p><strong>Mensaje:</strong></p>
    <p>${payload.message.replace(/\n/g, '<br/>')}</p>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: payload.email,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error: ${response.status} ${body}`);
  }
}

export async function POST(request: Request) {
  const data = await request.formData();
  const clientIp = getClientIp(request);

  if (isRateLimited(clientIp)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  const locale = sanitize(data.get('locale')) || 'es';
  const source = sanitize(data.get('source')) || 'cinematic-site';
  const name = sanitize(data.get('name'));
  const company = sanitize(data.get('company'));
  const email = sanitize(data.get('email'));
  const message = sanitize(data.get('message'));
  const website = sanitize(data.get('website'));

  if (website) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!name || !email || !message || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await sendLeadEmail({
      locale,
      source,
      name,
      company,
      email,
      message,
    });
  } catch (error) {
    console.error('Lead email delivery failed:', error);
    return NextResponse.json({ ok: false, error: 'Lead delivery failed' }, { status: 500 });
  }

  const redirectPath = locale === 'en' ? '/en#final-contact' : '/es#final-contact';
  return NextResponse.redirect(new URL(`${redirectPath}?lead=ok`, request.url), { status: 303 });
}
