'use client';

import { useCallback, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@truthsentry/ui/components/button';
import { Field, FieldError, FieldLabel } from '@truthsentry/ui/components/field';
import { PasswordInputWithToggle } from '@/components/auth/password-input-with-toggle';
import { useRouter } from '@/i18n/navigation';
import { useApiToast } from '@/hooks/use-api-toast';
import { trpc } from '@/lib/trpc';

export function ResetPasswordForm({ token }: { token: string | null }): ReactElement {
    const t = useTranslations('auth.resetPassword');
    const tVal = useTranslations('auth.validation');
    const router = useRouter();
    const { notifyApiException, notifyApiInfo } = useApiToast();
    const [error, setError] = useState<string | null>(null);
    const mutation = trpc.auth.resetPassword.useMutation();

    const schema = useMemo(
        () =>
            z.object({
                password: z.string().min(8, tVal('passwordMin')),
            }),
        [tVal],
    );

    const onSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setError(null);
            if (!token) {
                setError(t('missingToken'));
                return;
            }

            const formData = new FormData(event.currentTarget);
            const parsed = schema.safeParse({ password: formData.get('password') });
            if (!parsed.success) {
                setError(parsed.error.issues[0]?.message ?? tVal('passwordInvalid'));
                return;
            }

            mutation.mutate(
                { token, newPassword: parsed.data.password },
                {
                    onSuccess: () => {
                        notifyApiInfo({
                            title: t('successTitle'),
                            description: t('successDescription'),
                        });
                        router.push('/sign-in');
                    },
                    onError: (err) => {
                        notifyApiException(err, 'auth.resetPassword.failed');
                    },
                },
            );
        },
        [mutation, notifyApiException, notifyApiInfo, router, schema, t, tVal, token],
    );

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <Field invalid={Boolean(error)}>
                <FieldLabel htmlFor="password">{t('newPassword')}</FieldLabel>
                <PasswordInputWithToggle id="password" name="password" autoComplete="new-password" required />
                {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button type="submit" loading={mutation.isPending} disabled={!token} className="w-full">
                {t('submit')}
            </Button>
        </form>
    );
}
