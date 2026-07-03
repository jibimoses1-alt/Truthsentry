'use client';

import { useCallback, useState, type FormEvent, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@truthsentry/ui/components/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@truthsentry/ui/components/input-otp';
import { useRouter } from '@/i18n/navigation';
import { useApiToast } from '@/hooks/use-api-toast';
import { trpc } from '@/lib/trpc';

export type VerifyEmailFormProps = {
    email: string | null;
};

const OTP_LENGTH = 6;

export function VerifyEmailForm({ email }: VerifyEmailFormProps): ReactElement {
    const t = useTranslations('auth.verify');
    const router = useRouter();
    const { notifyApiException, notifyApiInfo } = useApiToast();
    const verifyMutation = trpc.auth.verifyEmail.useMutation();
    const resendMutation = trpc.auth.resendVerification.useMutation();
    const [otp, setOtp] = useState('');

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!email) {
                notifyApiInfo({
                    title: t('missingEmailTitle'),
                    description: t('missingEmailDescription'),
                });
                return;
            }
            verifyMutation.mutate(
                { email, otpCode: otp },
                {
                    onSuccess: () => {
                        notifyApiInfo({
                            title: t('successTitle'),
                            description: t('successDescription'),
                        });
                        router.push('/chat');
                    },
                    onError: (error) => {
                        notifyApiException(error, 'auth.verify.failed');
                    },
                },
            );
        },
        [email, notifyApiException, notifyApiInfo, otp, router, t, verifyMutation],
    );

    const handleResend = useCallback(() => {
        if (resendMutation.isPending) return;
        resendMutation.mutate(undefined, {
            onSuccess: () => {
                notifyApiInfo({
                    title: t('resentTitle'),
                    description: t('resentDescription'),
                });
            },
            onError: (error) => {
                notifyApiException(error, 'auth.verify.resendFailed');
            },
        });
    }, [notifyApiException, notifyApiInfo, resendMutation, t]);

    return (
        <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-6">
            <p className="text-center text-[length:0.875rem] leading-relaxed text-[var(--lp-fg-muted)]">
                {email ? t('body', { email }) : t('bodyNoEmail')}
            </p>

            <InputOTP maxLength={OTP_LENGTH} value={otp} onChange={setOtp}>
                <InputOTPGroup size="lg">
                    {Array.from({ length: OTP_LENGTH }, (_, i) => (
                        <InputOTPSlot key={i} index={i} />
                    ))}
                </InputOTPGroup>
            </InputOTP>

            <Button type="submit" loading={verifyMutation.isPending} disabled={otp.length !== OTP_LENGTH} className="w-full">
                <ShieldCheck className="size-4 opacity-90" />
                {t('submit')}
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-x-1 text-center text-[length:0.8125rem] text-[var(--lp-fg-muted)]">
                <span>{t('resendPrompt')}</span>
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    loading={resendMutation.isPending}
                    onClick={handleResend}
                    className="inline-flex h-auto min-h-0 gap-1.5 px-1 py-0 text-[var(--lp-accent)]"
                >
                    <RefreshCw className="size-3.5 shrink-0" />
                    {t('resend')}
                </Button>
            </div>
        </form>
    );
}
