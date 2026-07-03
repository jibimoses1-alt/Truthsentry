'use client';

import {
    useCallback,
    useMemo,
    useState,
    type FormEvent,
    type ReactElement,
} from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { Button } from '@truthsentry/ui/components/button';
import { Field, FieldError, FieldLabel } from '@truthsentry/ui/components/field';
import { Input } from '@truthsentry/ui/components/input';
import { PasswordInputWithToggle } from '@/components/auth/password-input-with-toggle';
import { useRouter, Link } from '@/i18n/navigation';
import { useApiToast } from '@/hooks/use-api-toast';
import { trpc } from '@/lib/trpc';
import { resolveSafeRedirectPath } from '@/lib/safe-redirect';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export type SignInFormProps = {
    searchParams?: Record<string, string>;
};

export function SignInForm({ searchParams }: SignInFormProps): ReactElement {
    const t = useTranslations('auth');
    const tCommon = useTranslations('common');
    const tVal = useTranslations('auth.validation');
    const router = useRouter();
    const { notifyApiException } = useApiToast();
    const [errors, setErrors] = useState<FieldErrors>({});
    const login = trpc.auth.login.useMutation();

    const signInSchema = useMemo(
        () =>
            z.object({
                email: z.string().min(1, tVal('emailRequired')).email(tVal('emailInvalid')),
                password: z.string().min(1, tVal('passwordRequired')),
            }),
        [tVal],
    );

    const handleSubmit = useCallback(
        (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setErrors({});

            const formData = new FormData(e.currentTarget);
            const result = signInSchema.safeParse({
                email: formData.get('email'),
                password: formData.get('password'),
            });

            if (!result.success) {
                const fieldErrors: FieldErrors = {};
                for (const issue of result.error.issues) {
                    const key = issue.path[0] as keyof FieldErrors;
                    if (key && !fieldErrors[key]) {
                        fieldErrors[key] = issue.message;
                    }
                }
                setErrors(fieldErrors);
                return;
            }

            login.mutate(
                {
                    email: result.data.email,
                    password: result.data.password,
                },
                {
                    onSuccess: () => {
                        router.push(resolveSafeRedirectPath(searchParams?.next));
                    },
                    onError: (error) => {
                        notifyApiException(error, 'auth.signIn.failed');
                    },
                },
            );
        },
        [login, notifyApiException, router, searchParams?.next, signInSchema],
    );

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {searchParams
                ? Object.entries(searchParams).map(([k, v]) => (
                      <input key={k} type="hidden" name={k} value={v} />
                  ))
                : null}

            <Field invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="email">{tCommon('email')}</FieldLabel>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(errors.email) || undefined}
                />
                {errors.email ? <FieldError>{errors.email}</FieldError> : null}
            </Field>

            <Field invalid={Boolean(errors.password)}>
                <FieldLabel htmlFor="password">{tCommon('password')}</FieldLabel>
                <PasswordInputWithToggle
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    required
                    aria-invalid={Boolean(errors.password) || undefined}
                />
                {errors.password ? <FieldError>{errors.password}</FieldError> : null}
                <div className="pt-1 text-end text-xs">
                    <Link href="/forgot-password" className="text-[var(--lp-accent)] hover:underline">
                        {t('signIn.forgotPassword')}
                    </Link>
                </div>
            </Field>

            <Button type="submit" loading={login.isPending} className="mt-1 w-full">
                {t('signIn.submit')}
            </Button>
        </form>
    );
}
