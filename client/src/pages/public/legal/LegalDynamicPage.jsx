import { useParams, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Lazy load individual legal pages
const TermsPage = lazy(() => import('./TermsPage'));
const PrivacyPolicyPage = lazy(() => import('./PrivacyPolicyPage'));
const RefundPolicyPage = lazy(() => import('./RefundPolicyPage'));
const CookiePolicyPage = lazy(() => import('./CookiePolicyPage'));
const DisclaimerPage = lazy(() => import('./DisclaimerPage'));

const LEGAL_PAGES = {
    'terms-and-conditions': TermsPage,
    'privacy-policy': PrivacyPolicyPage,
    'refund-policy': RefundPolicyPage,
    'cookie-policy': CookiePolicyPage,
    'disclaimer': DisclaimerPage,
};

/**
 * LegalDynamicPage — A wrapper that dynamically renders legal documents 
 * based on the :title parameter in the URL.
 */
export default function LegalDynamicPage() {
    const { title } = useParams();
    
    const Component = LEGAL_PAGES[title];

    if (!Component) {
        // Fallback to terms if slug is invalid, or could go to 404
        return <Navigate to="/legal/terms-and-conditions" replace />;
    }

    return (
        <Suspense fallback={<div className="min-h-screen theme-surface animate-pulse" />}>
            <Component />
        </Suspense>
    );
}
