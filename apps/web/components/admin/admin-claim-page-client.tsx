'use client';

import { useCallback, useState, type FormEvent, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@truthsentry/ui/components/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@truthsentry/ui/components/select';
import { Textarea } from '@truthsentry/ui/components/textarea';
import { Link, useRouter } from '@/i18n/navigation';
import { useApiToast } from '@/hooks/use-api-toast';
import { trpc } from '@/lib/trpc';

const VERDICT_OPTIONS = [
    'VERIFIED',
    'DEBUNKED',
    'MISLEADING',
    'PARTIALLY_TRUE',
    'PENDING',
] as const;

type Verdict = (typeof VERDICT_OPTIONS)[number];

export function AdminClaimPageClient({ claimId }: { claimId: string }): ReactElement {
    const t = useTranslations('admin');
    const router = useRouter();
    const { notifyApiException, notifyApiSuccess } = useApiToast();
    const session = trpc.session.me.useQuery();
    const claim = trpc.admin.claimById.useQuery(
        { claimId },
        { enabled: session.data?.role === 'ADMIN' },
    );
    const resolveClaim = trpc.admin.resolveClaim.useMutation();
    const [verdict, setVerdict] = useState<Verdict>('VERIFIED');
    const [reviewText, setReviewText] = useState('');

    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (!reviewText.trim()) return;
            resolveClaim.mutate(
                {
                    claimId,
                    factCheckStatus: verdict,
                    factCheckText: reviewText.trim(),
                },
                {
                    onSuccess: () => {
                        notifyApiSuccess({
                            title: t('resolveSuccessTitle'),
                            description: t('resolveSuccessDescription'),
                        });
                        router.push('/admin/queue');
                    },
                    onError: (error) => {
                        notifyApiException(error, 'admin.resolveFailed');
                    },
                },
            );
        },
        [claimId, notifyApiException, notifyApiSuccess, resolveClaim, reviewText, router, t, verdict],
    );

    if (session.isLoading || claim.isLoading) {
        return <p className="text-muted-foreground px-4 py-10 text-sm">{t('loading')}</p>;
    }

    if (session.data?.role !== 'ADMIN') {
        return (
            <div className="mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
                <h1 className="text-xl font-semibold">{t('forbiddenTitle')}</h1>
                <Button render={<Link href="/chat" />}>{t('backToChat')}</Button>
            </div>
        );
    }

    if (!claim.data) {
        return <p className="text-muted-foreground px-4 py-10 text-sm">{t('claimNotFound')}</p>;
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
            <header className="space-y-2">
                <Button variant="ghost" size="sm" render={<Link href="/admin/queue" />}>
                    {t('backToQueue')}
                </Button>
                <h1 className="text-2xl font-semibold tracking-tight">
                    {claim.data.title ?? t('untitled')}
                </h1>
                <p className="text-muted-foreground text-sm">
                    {claim.data.userEmail} · {claim.data.status} · {claim.data.factCheckStatus}
                </p>
            </header>

            <section className="space-y-3">
                <h2 className="text-sm font-medium">{t('threadTitle')}</h2>
                <ul className="divide-border max-h-96 divide-y overflow-y-auto rounded-lg border">
                    {claim.data.messages.map((message) => (
                        <li key={message.id} className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs font-medium uppercase">
                                {message.role}
                            </p>
                            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
                <h2 className="text-sm font-medium">{t('resolveTitle')}</h2>
                <div className="space-y-2">
                    <label htmlFor="verdict" className="text-sm font-medium">
                        {t('verdictLabel')}
                    </label>
                    <Select value={verdict} onValueChange={(value) => setVerdict(value as Verdict)}>
                        <SelectTrigger id="verdict">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {VERDICT_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {t(`verdict.${option}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <label htmlFor="reviewText" className="text-sm font-medium">
                        {t('reviewTextLabel')}
                    </label>
                    <Textarea
                        id="reviewText"
                        value={reviewText}
                        onChange={(event) => setReviewText(event.target.value)}
                        rows={6}
                        required
                    />
                </div>
                <Button type="submit" loading={resolveClaim.isPending}>
                    {t('submitReview')}
                </Button>
            </form>
        </div>
    );
}
