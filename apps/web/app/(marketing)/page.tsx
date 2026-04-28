import type { Metadata } from 'next'
import type { ReactElement } from 'react'
import {
    LandingBullets,
    LandingFaq,
    LandingHero,
    LandingKitRoot,
    LandingSiteFooter,
    LandingSiteHeader,
    LandingSteps,
} from '@afalambe/ui/landing'

import { LandingFeatures } from '@/components/landing-features'
import { ThemeToggle } from '@/components/theme-toggle'
import { buildJsonLd, siteDefaultDescription, siteLogoDarkPath, siteLogoPath, siteName } from '@/lib/site'

export const metadata: Metadata = {
    title: siteName,
    description: siteDefaultDescription,
    alternates: {
        canonical: '/',
    },
    openGraph: {
        title: siteName,
        description: siteDefaultDescription,
        url: '/',
    },
    twitter: {
        title: siteName,
        description: siteDefaultDescription,
    },
}

const steps = [
    {
        title: 'Connexion',
        description: "Creez un compte ou revenez avec votre e-mail. La verification maintient une file d'attente fiable.",
    },
    {
        title: 'Decrivez votre dossier dans le chat',
        description: "Utilisez la langue de votre choix, y compris le fula et le peul. L'assistant lit tout votre contexte.",
    },
    {
        title: 'Recevez un resultat ou un relais humain',
        description: "Les correspondances a forte confiance donnent une reponse claire. Sinon, votre dossier passe en verification humaine.",
    },
]

const bullets = [
    {
        title: 'Connaissances selectionnees',
        body: "Les reponses s'appuient sur des sources et politiques validees, pas sur le web ouvert.",
    },
    {
        title: 'Confiance visible',
        body: "Nous montrons quand le modele est confiant, quand il ne l'est pas, et quand une decision humaine est requise.",
    },
    {
        title: 'Escalade humaine',
        body: 'Les dossiers sensibles ou sans correspondance sont envoyes aux relecteurs avec tout le contexte conserve.',
    },
    {
        title: 'Respect de la confidentialite',
        body: 'Chiffrement en transit, donnees minimales dans les prompts et regles de retention documentees pour les operateurs.',
    },
]

const faqItems = [
    {
        question: 'Quelles langues sont prises en charge ?',
        answer: "L'interface produit est disponible en francais et en anglais. Le texte des dossiers peut etre saisi en Unicode, y compris en fula et en peul.",
    },
    {
        question: 'Est-ce un conseil juridique ?',
        answer: 'Non. Afalambè aide a verifier avec des sources selectionnees. Les operateurs restent responsables des decisions officielles.',
    },
    {
        question: "Que se passe-t-il si l'IA n'est pas certaine ?",
        answer: 'Votre dossier est place en file de verification humaine. Vous recevez des mises a jour par e-mail lorsque les templates sont actives.',
    },
    {
        question: 'Qui peut voir mon dossier ?',
        answer: "Vous, les systemes automatises impliques dans le traitement, et les relecteurs autorises. Les roles exacts sont definis par la politique du programme.",
    },
    {
        question: 'Puis-je utiliser cela sans me connecter ?',
        answer: "La page publique et cet apercu du chat sont accessibles. L'envoi de dossiers reels necessite un compte selon la specification API.",
    },
    {
        question: "Ou se trouve l'interface de chat ?",
        answer: "Utilisez le lien Chat pour l'interface complete de l'assistant. Le produit authentifie suivra les memes tokens de mise en page.",
    },
]

export default function LandingPage(): ReactElement {
    const jsonLd = buildJsonLd()
    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    }

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
                brand={siteName}
                brandLogoSrc={siteLogoPath}
                brandLogoDarkSrc={siteLogoDarkPath}
                brandLogoAlt={siteName}
                headerActions={<ThemeToggle />}
                signInHref="/sign-in"
                primaryCtaHref="/sign-up"
                primaryCtaLabel="Commencer"
            />
            <LandingHero
                title="Verifier les dossiers avec des limites claires"
                subtitle={siteDefaultDescription}
                primaryHref="/sign-up"
                primaryLabel="Demarrer dans le chat"
                secondaryHref="/sign-in"
                secondaryLabel="Connexion"
            />
            <LandingFeatures />
            <LandingSteps id="how" heading="Fonctionnement" steps={steps} />
            <LandingBullets id="why" heading="Pourquoi Afalambè" items={bullets} />
            <LandingFaq id="faq" heading="Questions frequentes" items={faqItems} />
            <LandingSiteFooter
                brand={siteName}
                brandLogoSrc={siteLogoPath}
                brandLogoDarkSrc={siteLogoDarkPath}
                brandLogoAlt={siteName}
            />
        </LandingKitRoot>
    )
}
