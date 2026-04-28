# Environment Contract

This document defines required environment variables by runtime.

## apps/web

- `NEXT_PUBLIC_APP_URL`: public application URL
- `NEXT_PUBLIC_API_URL`: API endpoint used by web client

## apps/api

- `API_PORT`: server port
- `DATABASE_URL`: Postgres connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `SUPABASE_STORAGE_BUCKET_CHAT_UPLOADS`: storage bucket for chat image uploads
- `CHAT_IMAGE_MAX_BYTES`: max image upload size in bytes
- `CHAT_ALLOWED_IMAGE_MIME_TYPES`: comma-separated allowlist for image mimes
- `AUTH_SECRET`: auth/session secret used for server-side credentials
- `AUTH_COOKIE_NAME`: HTTP-only session cookie name
- `AUTH_COOKIE_SECURE`: set `true` in production
- `RESEND_API_KEY`: Resend API key for transactional sends
- `EMAIL_FROM`: verified sender address for transactional sends
- `RESEND_WEBHOOK_SIGNING_SECRET`: shared secret used to verify Resend webhook requests

## packages/emails (Resend)

- `RESEND_API_KEY`: Resend API key
- `EMAIL_FROM`: verified sender email

## packages/prisma

- `DATABASE_URL`: Prisma datasource URL

## AI pipeline

- `AI_PROVIDER`: provider identifier
- `AI_MODEL`: model name/version
- `AI_API_KEY`: provider API key

## Notes

- Keep secrets out of source control.
- Commit only `.env.example` templates without real credentials.
