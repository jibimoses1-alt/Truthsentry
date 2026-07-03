'use client';

import { useCallback, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@truthsentry/ui/components/button';
import { Field, FieldError, FieldLabel } from '@truthsentry/ui/components/field';
import { Input } from '@truthsentry/ui/components/input';
import { useApiToast } from '@/hooks/use-api-toast';
import { trpc } from '@/lib/trpc';

export function RequestPasswordResetForm(): ReactElement {
    const t = useTranslations('auth.forgotPassword');
    const tCommon = useTranslations('common');
    const tVal = useTranslations('auth.validation');
    const { notifyApiException, notifyApiInfo } = useApiToast();
    const [error, setError] = useState<string | null>(null);
    const mutation = trpc.auth.requestPasswordReset.useMutation();

    const schema = useMemo(
        () =>
            z.object({
                email: z.string().min(1, tVal('emailRequired')).email(tVal('emailInvalid')),
            }),
        [tVal],
    );

    const onSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setError(null);

            const formData = new FormData(event.currentTarget);
            const parsed = schema.safeParse({ email: formData.get('email') });
            if (!parsed.success) {
                setError(parsed.error.issues[0]?.message ?? tVal('emailInvalid'));
                return;
            }

            mutation.mutate(
                { email: parsed.data.email },
                {
                    onSuccess: () => {
                        notifyApiInfo({
                            title: t('successTitle'),
                            description: t('successDescription'),
                        });
                    },
                    onError: (err) => {
                        notifyApiException(err, 'auth.forgotPassword.failed');
                    },
                },
            );
        },
        [mutation, notifyApiException, notifyApiInfo, schema, t, tVal],
    );

    return (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
            <Field invalid={Boolean(error)}>
                <FieldLabel htmlFor="email">{tCommon('email')}</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="email" required />
                {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button type="submit" loading={mutation.isPending} className="w-full">
                {t('submit')}
            </Button>
        </form>
    );
}
