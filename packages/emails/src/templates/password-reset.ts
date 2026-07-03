import { type EmailLocale, resolveEmailLocale } from '../locale';

type PasswordResetTemplateArgs = {
    resetUrl: string;
    locale?: string;
};

const COPY = {
    ar: {
        subject: 'إعادة تعيين كلمة مرور TruthSentry',
        heading: 'طلب إعادة تعيين كلمة المرور',
        body: 'تلقّينا طلبًا لإعادة تعيين كلمة مرورك.',
        button: 'إعادة تعيين كلمة المرور',
        ignore: 'إذا لم تطلب ذلك، تجاهل هذا البريد.',
        fallback: 'إذا لم يعمل الزر، انسخ هذا الرابط:',
    },
    en: {
        subject: 'Reset your TruthSentry password',
        heading: 'Password reset request',
        body: 'We received a request to reset your password.',
        button: 'Reset password',
        ignore: 'If you did not request this, ignore this email.',
        fallback: 'If the button does not work, copy this link:',
    },
} as const;

export function passwordResetSubject(locale?: string): string {
    return COPY[resolveEmailLocale(locale)].subject;
}

export function passwordResetHtml(args: PasswordResetTemplateArgs): string {
    const locale = resolveEmailLocale(args.locale);
    const c = COPY[locale];
    const dir = locale === 'ar' ? 'rtl' : 'ltr';

    return `
<div dir="${dir}" style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
  <h2>${c.heading}</h2>
  <p>${c.body}</p>
  <p><a href="${args.resetUrl}" style="display:inline-block;padding:10px 16px;background:#42acb5;color:#fff;text-decoration:none;border-radius:6px;">${c.button}</a></p>
  <p>${c.ignore}</p>
  <p>${c.fallback}</p>
  <p>${args.resetUrl}</p>
</div>
`.trim();
}

export function passwordResetText(args: PasswordResetTemplateArgs): string {
    const locale = resolveEmailLocale(args.locale);
    const c = COPY[locale];

    return [c.subject, '', c.body, '', `${c.button}: ${args.resetUrl}`, '', c.ignore].join('\n');
}
