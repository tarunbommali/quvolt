

import LegalLayout, { LegalSection, LegalList } from './LegalLayout';
import { typography, cx } from '../../../styles/index';

export default function CookiePolicyPage() {
    return (
        <LegalLayout title="Cookie Policy" lastUpdated={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}>
            <div className={cx(typography.body, "mb-8 leading-relaxed")}>
                <p>At <strong className={typography.bodyStrong}>Quvolt</strong>, we use cookies to ensure that we give you the best experience on our website. This Cookie Policy explains how we use them.</p>
            </div>

            <LegalSection title="1. What Are Cookies">
                <p className={typography.body}>Cookies are small text files that are stored on your device (computer, smartphone, or other electronic device) when you visit our platform.</p>
            </LegalSection>

            <LegalSection title="2. How We Use Cookies">
                <p>We use cookies for a variety of critical functions, including:</p>
                <LegalList items={[
                    "Login sessions and active authentication",
                    "Storing your user preferences",
                    "Providing analytics on platform usage",
                ]} />
            </LegalSection>

            <LegalSection title="3. Types of Cookies">
                <p>The cookies we use can be categorized as follows:</p>
                <LegalList items={[
                    "Essential cookies (strictly required for the platform to function)",
                    "Analytics cookies (to understand user behavior)",
                    "Performance cookies (to optimize load times)",
                ]} />
            </LegalSection>

            <LegalSection title="4. Managing Cookies">
                <p>You have the right to accept or disable cookies at any time. You can typically manage your cookie preferences through your web browser settings. Disabling essential cookies may result in a degraded experience or broken functionality.</p>
            </LegalSection>

            <LegalSection title="5. Third-Party Cookies">
                <p>We may also use established third-party services that set their own cookies, such as:</p>
                <LegalList items={[
                    "Google Analytics",
                    "Payment providers (Stripe, Razorpay)",
                ]} />
            </LegalSection>

            <LegalSection title="6. Contact">
                <p>If you have questions about our use of cookies, contact us at: <a href="mailto:support@quvolt.com" className={typography.link}>support@quvolt.com</a></p>
            </LegalSection>
        </LegalLayout>
    );
}
