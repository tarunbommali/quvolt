import { useLocation } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import Footer from '../../../components/common/Footer';
import { layout, typography, cx } from '../../../styles/index';

const routeLabel = {
    '/terms': 'Terms & Conditions',
    '/privacy': 'Privacy Policy',
    '/refund': 'Refund & Cancellation',
    '/cookies': 'Cookie Policy',
    '/disclaimer': 'Disclaimer',
    '/legal/terms-and-conditions': 'Terms & Conditions',
    '/legal/privacy-policy': 'Privacy Policy',
    '/legal/refund-policy': 'Refund & Cancellation',
    '/legal/cookie-policy': 'Cookie Policy',
    '/legal/disclaimer': 'Disclaimer',
};

/**
 * LegalLayout — High-level layout for public-facing legal documents.
 * Integrates with the application's design system (app-shell, typography).
 * Includes breadcrumb navigation.
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
            <main className={layout.page + " flex-1 z-10 !py-8 md:!py-12"}>
                <div className="space-y-8">
                    <PageHeader
                        breadcrumbs={[
                            { label: 'Legal' },
                            { label: currentLabel }
                        ]}
                    />

                    {/* ── Content layout — Expanded to match system width ── */}
                    <div className="w-full">
                        <article className="w-full">
                            <div className="bg-white dark:bg-gray-900/50 rounded-[3rem] overflow-hidden border-2 theme-border shadow-2xl shadow-indigo-500/5">
                                <div className="p-8 md:p-12 lg:p-16 space-y-12">
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
    <section className="space-y-6">
        {title && (
            <h2
                className={cx(
                    typography.h2,
                    !noBorder && "border-b-2 theme-border pb-4"
                )}
            >
                {title}
            </h2>
        )}
        <div className={cx(typography.body, "space-y-4 !leading-loose opacity-90")}>
            {children}
        </div>
    </section>
);

export const LegalList = ({ items }) => (
    <ul className="space-y-3">
        {items.map((item, idx) => (
            <li key={idx} className="flex gap-4">
                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className={cx(typography.body, "font-bold opacity-80")}>{item}</span>
            </li>
        ))}
    </ul>
);
