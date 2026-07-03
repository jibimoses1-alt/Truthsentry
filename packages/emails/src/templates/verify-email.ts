import { type EmailLocale, resolveEmailLocale } from '../locale';

type VerifyEmailTemplateArgs = {
    otpCode: string;
    locale?: string;
};

const COPY = {
    ar: {
        subject: 'تحقق من حسابك على TruthSentry',
        heading: 'تحقق من بريدك الإلكتروني',
        body: 'شكرًا لتسجيلك. أدخل رمز التحقق لمرة واحدة:',
        expiry: 'ينتهي هذا الرمز خلال 15 دقيقة.',
        codeLabel: 'الرمز',
    },
    en: {
        subject: 'Verify your TruthSentry account',
        heading: 'Verify your email',
        body: 'Thanks for signing up. Enter this one-time code to verify your email:',
        expiry: 'This code expires in 15 minutes.',
        codeLabel: 'Code',
    },
} as const;

export function verifyEmailSubject(locale?: string): string {
    return COPY[resolveEmailLocale(locale)].subject;
}

export function verifyEmailHtml(args: VerifyEmailTemplateArgs): string {
    const locale = resolveEmailLocale(args.locale);
    const c = COPY[locale];
    const dir = locale === 'ar' ? 'rtl' : 'ltr';

    return `
<div dir="${dir}" style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
  <h2>${c.heading}</h2>
  <p>${c.body}</p>
  <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.2em; margin: 12px 0;">${args.otpCode}</p>
  <p>${c.expiry}</p>
</div>
`.trim();
}

export function verifyEmailText(args: VerifyEmailTemplateArgs): string {
    const locale = resolveEmailLocale(args.locale);
    const c = COPY[locale];

    return [c.subject, '', c.body, '', `${c.codeLabel}: ${args.otpCode}`, '', c.expiry].join('\n');
}
