import { type EmailLocale, resolveEmailLocale } from '../locale';

type ClaimResolvedTemplateArgs = {
    claimId: string;
    locale?: string;
};

const COPY = {
    ar: {
        subject: 'تم حل ملفك',
        heading: 'تم حل الملف',
        body: 'انتهت مراجعة ملفك.',
        claimId: 'معرّف الملف',
        footer: 'افتح المحادثة لعرض تفاصيل القرار.',
    },
    en: {
        subject: 'Your dossier has been resolved',
        heading: 'Dossier resolved',
        body: 'Review of your dossier is complete.',
        claimId: 'Dossier ID',
        footer: 'Open chat to see the resolution details.',
    },
} as const satisfies Record<EmailLocale, Record<string, string>>;

export function claimResolvedSubject(locale?: string): string {
    return COPY[resolveEmailLocale(locale)].subject;
}

export function claimResolvedHtml(args: ClaimResolvedTemplateArgs): string {
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

export function claimResolvedText(args: ClaimResolvedTemplateArgs): string {
    const locale = resolveEmailLocale(args.locale);
    const c = COPY[locale];

    return [c.subject, '', c.body, '', `${c.claimId}: ${args.claimId}`, '', c.footer].join('\n');
}
