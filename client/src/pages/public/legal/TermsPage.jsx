

import LegalLayout, { LegalSection, LegalList } from './LegalLayout';
import { typography, cx } from '../../../styles/index';

export default function TermsPage() {
    return (
        <LegalLayout title="Terms and Conditions" lastUpdated={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}>
            <div className={cx(typography.body, "mb-8 leading-relaxed")}>
                <p>Welcome to <strong className={typography.bodyStrong}>Quvolt</strong>, a real-time quiz platform. By using our services, you agree to these Terms.</p>
            </div>

            <LegalSection title="1. Use of Service">
                <p>You agree to use Quvolt only for lawful purposes. You must not:</p>
                <LegalList items={[
                    "Disrupt live sessions",
                    "Use bots or automation",
                    "Attempt to bypass security",
                ]} />
            </LegalSection>

            <LegalSection title="2. Accounts">
                <LegalList items={[
                    "You are responsible for your account",
                    "Keep credentials secure",
                    "You are liable for all activity under your account",
                ]} />
            </LegalSection>

            <LegalSection title="3. Quiz Sessions">
                <LegalList items={[
                    "Sessions are real-time and controlled by hosts",
                    "Network issues may affect participation",
                    "We do not guarantee uninterrupted service",
                ]} />
            </LegalSection>

            <LegalSection title="4. Payments">
                <LegalList items={[
                    "Payments are handled via third-party gateways",
                    "Subscriptions are non-refundable unless stated otherwise",
                    "Pricing may change with prior notice",
                ]} />
            </LegalSection>

            <LegalSection title="5. Roles & Permissions">
                <LegalList items={[
                    "Access is role-based (Admin, Host, Participant)",
                    "Unauthorized access attempts may lead to immediate suspension",
                ]} />
            </LegalSection>

            <LegalSection title="6. Termination">
                <p>We may suspend or terminate accounts for:</p>
                <LegalList items={[
                    "Abuse of the platform",
                    "Fraudulent activity",
                    "Violation of these Terms",
                ]} />
            </LegalSection>

            <LegalSection title="7. Liability">
                <p>We are not responsible for:</p>
                <LegalList items={[
                    "Data loss",
                    "Missed quiz responses",
                    "Platform downtime",
                ]} />
            </LegalSection>

            <LegalSection title="8. Updates">
                <p>We reserve the right to update these Terms at any time. Continued use of the platform after updates constitutes your consent to the changes.</p>
            </LegalSection>

            <LegalSection title="9. Contact">
                <p>If you have any questions about these Terms, contact us at: <a href="mailto:support@quvolt.com" className={typography.link}>support@quvolt.com</a></p>
            </LegalSection>
        </LegalLayout>
    );
}
