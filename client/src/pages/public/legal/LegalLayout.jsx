import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import Footer from '../../../components/Footer';

const legalLinks = [
    { path: '/terms', label: 'Terms & Conditions' },
    { path: '/privacy', label: 'Privacy Policy' },
    { path: '/refund', label: 'Refund & Cancellation' },
    { path: '/cookies', label: 'Cookie Policy' },
    { path: '/disclaimer', label: 'Disclaimer' },
];

/**
 * Maps the current legal route to a human-readable breadcrumb label.
 */
const routeLabel = {
    '/terms': 'Terms & Conditions',
    '/privacy': 'Privacy Policy',
    '/refund': 'Refund & Cancellation',
    '/cookies': 'Cookie Policy',
    '/disclaimer': 'Disclaimer',
};

/**
 * LegalLayout — High-level layout for public-facing legal documents.
 * Integrates with the application's design system (app-shell, typography).
 * Includes breadcrumb navigation (Home > Legal > Document) and sidebar links.
 *
 * @param {Object} props
 * @param {string} props.title - The title of the legal document.
 * @param {string} props.lastUpdated - Human-readable "Last Updated" date string.
 * @param {React.ReactNode} props.children - The specific content of the document.
 */
export default function LegalLayout({ title, lastUpdated, children }) {
    const { pathname } = useLocation();
    const currentLabel = routeLabel[pathname] || 'Legal';

    return (
        <div className="app-shell flex flex-col min-h-screen w-full">
            {/* Ambient glow — matches app-shell pattern */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute left-1/2 top-[-15%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[color-mix(in_srgb,var(--qb-primary)_14%,transparent)] blur-[90px]" />
            </div>

            <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 z-10">
                <div className="space-y-8">

                    {/* ── Breadcrumbs + Page header ── */}
                    <div className="space-y-3">
                        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1">
                            <Link
                                to="/"
                                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--qb-text-3)] hover:text-[var(--qb-primary)] transition-colors"
                            >
                                <Home size={13} />
                                Home
                            </Link>

                            <ChevronRight size={13} className="text-[var(--qb-text-3)] shrink-0" />

                            <Link
                                to="/terms"
                                className="text-sm font-semibold text-[var(--qb-text-3)] hover:text-[var(--qb-primary)] transition-colors"
                            >
                                Legal
                            </Link>

                            <ChevronRight size={13} className="text-[var(--qb-text-3)] shrink-0" />

                            <span className="text-sm font-semibold text-[var(--qb-text-1)]">
                                {currentLabel}
                            </span>
                        </nav>

                        <div className="space-y-1">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--qb-text-1)]">
                                {title}
                            </h1>
                            <p className="text-[11px] font-black tracking-[0.18em] uppercase text-[var(--qb-text-3)]">
                                Last Updated: {lastUpdated}
                            </p>
                        </div>
                    </div>

                    {/* ── Two-column layout: sidebar + content ── */}
                    <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">

                        {/* Sidebar navigation */}
                        <nav
                            aria-label="Legal documents"
                            className="w-full md:w-56 shrink-0 flex flex-col gap-1 p-2 rounded-2xl border theme-border theme-surface shadow-sm sticky top-[4.5rem]"
                        >
                            <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--qb-text-3)]">
                                Legal Documents
                            </p>

                            {legalLinks.map((link) => {
                                const isActive = pathname === link.path;
                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={[
                                            'px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-between',
                                            isActive
                                                ? 'bg-[color-mix(in_srgb,var(--qb-primary)_12%,var(--qb-surface-1))] text-[var(--qb-primary)]'
                                                : 'text-[var(--qb-text-2)] hover:bg-[var(--qb-surface-2)] hover:text-[var(--qb-text-1)]',
                                        ].join(' ')}
                                    >
                                        {link.label}
                                        {isActive && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--qb-primary)] shrink-0" />
                                        )}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Document content */}
                        <article className="flex-1 w-full min-w-0">
                            <div className="surface-card rounded-3xl overflow-hidden">
                                <div className="p-6 md:p-8 lg:p-10 space-y-10 text-[var(--qb-text-1)]">
                                    {children}
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </main>

            <div className="z-10 relative mt-6">
                <Footer />
            </div>
        </div>
    );
}

export const LegalSection = ({ title, children, noBorder = false }) => (
    <section className="space-y-4">
        {title && (
            <h2
                className={[
                    'text-lg md:text-xl font-black tracking-tight text-[var(--qb-text-1)] pb-3',
                    !noBorder && 'border-b theme-border',
                ].filter(Boolean).join(' ')}
            >
                {title}
            </h2>
        )}
        <div className="space-y-3 text-sm md:text-base font-medium text-[var(--qb-text-2)] leading-relaxed">
            {children}
        </div>
    </section>
);

export const LegalList = ({ items }) => (
    <ul className="list-disc pl-5 space-y-2">
        {items.map((item, idx) => (
            <li key={idx} className="pl-1.5 marker:text-[var(--qb-primary)] text-sm md:text-base font-medium text-[var(--qb-text-2)] leading-relaxed">
                {item}
            </li>
        ))}
    </ul>
);
