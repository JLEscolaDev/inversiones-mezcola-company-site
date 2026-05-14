# INVERSIONES MEZCOLÁ SL - Cinematic Prototype

Production-oriented Next.js App Router website (ES/EN), prepared for Vercel deployment with IONOS domain + email kept in IONOS.

## Stack

- Next.js (App Router) + TypeScript
- CSS Modules + global CSS
- GSAP ScrollTrigger
- Lenis
- Locale metadata + canonical/hreflang
- `sitemap.ts` + `robots.ts`
- JSON-LD (`Organization` + `WebSite`)

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Environment variables

Copy `.env.example` to `.env.local` for local testing:

```bash
cp .env.example .env.local
```

Required in Vercel (Production + Preview):

- `RESEND_API_KEY`
- `LEAD_TO_EMAIL`
- `LEAD_FROM_EMAIL`

## Lead form production behavior

- POST `/api/lead`
- Honeypot anti-bot field (`website`)
- Basic IP rate limit (5 requests/minute per IP)
- Sends email through Resend API
- Redirects back to `/#final-contact` after success

## Security hardening

Configured response headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Deploy to Vercel (recommended)

1. Push this repo to GitHub.
2. In Vercel: `Add New Project` -> import repo.
3. Framework detected as Next.js automatically.
4. Add the 3 env vars from `.env.example`.
5. Deploy.
6. In Vercel project settings -> Domains, add:
   - `inversionesmezcola.es`
   - `www.inversionesmezcola.es`

## IONOS DNS migration (keep domain + email, cancel web hosting)

Important: do **not** delete MX/TXT/SPF/DKIM records used by your mail.

At IONOS DNS Zone:

1. Keep existing email records as they are:
   - `MX` records
   - `TXT` SPF/DKIM/DMARC
   - any mail-related `CNAME`
2. Remove only old web-hosting records that point to current IONOS hosting (A/AAAA/CNAME for website).
3. Configure web records for Vercel:
   - `A` record for root `@` -> `76.76.21.21`
   - `CNAME` for `www` -> `cname.vercel-dns.com`
4. Save changes and wait for propagation (usually minutes, up to 24h).
5. In Vercel, confirm both domains show as `Valid Configuration`.

## Tomorrow cutover checklist

1. Vercel project deployed and healthy.
2. Env vars set in Vercel.
3. Domain records changed in IONOS (web only, mail untouched).
4. Verify live URLs:
   - `https://inversionesmezcola.es/es`
   - `https://inversionesmezcola.es/en`
5. Submit contact form and confirm email reception.
6. Only then cancel IONOS web hosting subscription, keeping domain + mail plan.

## Acceptance checks

```bash
npm run build
```

Expected:

- build passes
- TypeScript passes
- localized routes (`/es`, `/en`) generated
