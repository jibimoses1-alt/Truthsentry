import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import {
    LandingDynamicFeatures,
    LandingFaqSplit,
    LandingFeatureSpotlight,
    LandingHero,
    LandingKitRoot,
    LandingSiteFooter,
    LandingSiteHeader,
    LandingSkillsSuite,
    LandingTestimonials,
} from '@truthsentry/ui/landing';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { routing, type AppLocale } from '@/i18n/routing';
import { buildJsonLd, getSiteMetadata, siteLogoOnDarkPath, siteLogoPath } from '@/lib/site';

type PageProps = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    const meta = await getSiteMetadata(locale as AppLocale);
    return {
        title: meta.siteName,
        description: meta.description,
        keywords: meta.keywords,
        alternates: { canonical: `/${locale}` },
        openGraph: {
            title: meta.siteName,
            description: meta.description,
            url: `/${locale}`,
            locale: meta.openGraphLocale,
            alternateLocale: meta.openGraphAlternateLocale,
        },
        twitter: {
            title: meta.siteName,
            description: meta.description,
        },
    };
}

export default async function LandingPage({ params }: PageProps): Promise<ReactElement> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations();
    const brand = t('common.brand');

    const faqItems = [0, 1, 2, 3, 4, 5].map((i) => ({
        question: t(`landing.faq.items.${i}.question`, { brand }),
        answer: t(`landing.faq.items.${i}.answer`, { brand }),
    }));

    const skillBlocks = ['prompts', 'outputs', 'response', 'evidence'].map((id) => ({
        id,
        title: t(`landing.skills.blocks.${id}.title`),
        description: t(`landing.skills.blocks.${id}.description`),
    }));

    const testimonials = [0, 1, 2].map((i) => ({
        id: String(i),
        quote: t(`landing.testimonials.items.${i}.quote`),
        name: t(`landing.testimonials.items.${i}.name`),
        role: t(`landing.testimonials.items.${i}.role`),
    }));

    const meta = await getSiteMetadata(locale as AppLocale);
    const jsonLd = buildJsonLd({
        locale: locale as AppLocale,
        description: meta.description,
    });
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
    };

    const navItems = [
        { href: '#how', label: t('landing.nav.how') },
        { href: '#why', label: t('landing.nav.why') },
        { href: '#faq', label: t('landing.nav.faq') },
    ];

    const footerColumns = {
        tagline: t('landing.footer.tagline'),
        productHeading: t('landing.footer.product'),
        product: [
            { label: t('landing.footer.features'), href: '/#why' },
            { label: t('landing.footer.integrations'), href: '#' },
            { label: t('landing.footer.pricing'), href: '#' },
            { label: t('landing.footer.changelog'), href: '#' },
        ],
        companyHeading: t('landing.footer.company'),
        company: [
            { label: t('landing.footer.about'), href: '#' },
            { label: t('landing.footer.blog'), href: '#' },
            { label: t('landing.footer.careers'), href: '#' },
            { label: t('landing.footer.contact'), href: '#' },
        ],
        resourcesHeading: t('landing.footer.resources'),
        resources: [
            { label: t('landing.footer.documentation'), href: '#' },
            { label: t('landing.footer.helpCenter'), href: '#' },
            { label: t('landing.footer.community'), href: '#' },
            { label: t('landing.footer.templates'), href: '#' },
        ],
        legal: [
            { label: t('landing.footer.privacy'), href: '/legal/privacy' },
            { label: t('landing.footer.terms'), href: '/legal/terms' },
            { label: t('landing.footer.cookiePolicy'), href: '#' },
        ],
        copyrightSuffix: t('landing.footer.copyright'),
    };

    return (
        <LandingKitRoot>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <LandingSiteHeader
                brand={brand}
                brandLogoSrc={siteLogoPath}
                brandLogoDarkSrc={siteLogoOnDarkPath}
                brandLogoAlt={brand}
                navItems={navItems}
                navAriaLabel={t('landing.nav.aria')}
                headerActions={
                    <>
                        <LocaleSwitcher />
                        <ThemeToggle />
                    </>
                }
                signInHref="/sign-in"
                signInLabel={t('common.signIn')}
                primaryCtaHref="/sign-up"
                primaryCtaLabel={t('common.getStarted')}
                chatHref="/chat"
                chatLabel={t('common.chat')}
            />
            <LandingHero
                id="how"
                title={t('landing.hero.title')}
                subtitle={t('landing.hero.subtitle', { brand })}
                primaryHref="/sign-up"
                primaryLabel={t('landing.hero.primaryCta')}
                secondaryHref="/sign-in"
                secondaryLabel={t('landing.hero.secondaryCta')}
                productName={brand}
                assistantMessage={t('landing.preview.assistantMessage')}
                userMessage={t('landing.preview.userMessage')}
                skills={[
                    { id: 'verify', title: t('landing.preview.skills.verify') },
                    { id: 'sources', title: t('landing.preview.skills.sources') },
                    { id: 'image', title: t('landing.preview.skills.image') },
                    { id: 'report', title: t('landing.preview.skills.report') },
                ]}
            />
            <LandingSkillsSuite
                id="why"
                badge={t('landing.skills.badge')}
                title={t('landing.skills.title', { brand })}
                subtitle={t('landing.skills.subtitle')}
                blocks={skillBlocks}
                ctaHref="/sign-up"
                ctaLabel={t('landing.skills.cta')}
            />
            <LandingFeatureSpotlight
                badge={t('landing.spotlight.badge')}
                title={t('landing.spotlight.title')}
                subtitle={t('landing.spotlight.subtitle', { brand })}
                bullets={[
                    t('landing.spotlight.bullets.0'),
                    t('landing.spotlight.bullets.1'),
                    t('landing.spotlight.bullets.2'),
                ]}
            />
            <LandingDynamicFeatures
                badge={t('landing.dynamicFeatures.badge')}
                title={t('landing.dynamicFeatures.title')}
            />
            <LandingTestimonials
                badge={t('landing.testimonials.badge')}
                title={t('landing.testimonials.title')}
                items={testimonials}
            />
            <LandingFaqSplit
                id="faq"
                badge={t('landing.faq.badge')}
                introTitle={t('landing.faq.introTitle')}
                introDescription={t('landing.faq.introDescription')}
                items={faqItems}
                defaultOpenIndex={1}
            />
            <LandingSiteFooter
                brand={brand}
                brandLogoSrc={siteLogoPath}
                brandLogoDarkSrc={siteLogoOnDarkPath}
                brandLogoAlt={brand}
                columns={footerColumns}
            />
        </LandingKitRoot>
    );
}
