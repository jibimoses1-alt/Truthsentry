import { type EmailLocale, resolveEmailLocale } from '../locale';

type ClaimQueuedTemplateArgs = {
    claimId: string;
    locale?: string;
};

const COPY = {
    ar: {
        subject: 'ملفك في قائمة الانتظار للمراجعة',
        heading: 'الملف قيد الانتظار',
        body: 'ملفك في قائمة انتظار المراجعة البشرية.',
        claimId: 'معرّف الملف',
        footer: 'سنُعلمك عند توفر قرار.',
    },
    en: {
        subject: 'Your dossier is queued for review',
        heading: 'Dossier queued',
        body: 'Your dossier is in the human review queue.',
        claimId: 'Dossier ID',
        footer: 'We will notify you when a resolution is available.',
    },
} as const satisfies Record<EmailLocale, Record<string, string>>;

export function claimQueuedSubject(locale?: string): string {
    return COPY[resolveEmailLocale(locale)].subject;
}

export function claimQueuedHtml(args: ClaimQueuedTemplateArgs): string {
    const locale = resolveEmailLocale(args.locale);
    const c = COPY[locale];
    const dir = locale === 'ar' ? 'rtl' : 'ltr';

    return `
<div dir="${dir}" style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
  <h2>${c.heading}</h2>
  <p>${c.body}</p>
  <p>${c.claimId}: <strong>${args.claimId}</strong></p>
  <p>${c.footer}</p>
</div>
`.trim();
}

export function claimQueuedText(args: ClaimQueuedTemplateArgs): string {
    const locale = resolveEmailLocale(args.locale);
    const c = COPY[locale];

    return [c.subject, '', c.body, '', `${c.claimId}: ${args.claimId}`, '', c.footer].join('\n');
}
