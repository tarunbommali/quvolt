import LegalLayout, { LegalSection, LegalList } from './LegalLayout';

export default function PrivacyPolicyPage() {
    return (
        <LegalLayout title="Privacy Policy" lastUpdated={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}>
            <div className="space-y-4 text-sm md:text-base font-medium theme-text-secondary leading-relaxed mb-8">
                <p>At <strong>Quvolt</strong>, we respect your privacy and are committed to protecting it through our compliance with this policy.</p>
            </div>

            <LegalSection title="1. Data We Collect">
                <LegalList items={[
                    "Account info (name, email)",
                    "Quiz activity (answers, scores)",
                    "Device & usage data",
                ]} />
            </LegalSection>

            <LegalSection title="2. How We Use Data">
                <LegalList items={[
                    "To run real-time quiz sessions",
                    "To improve platform performance",
                    "To prevent fraud and abuse",
                ]} />
            </LegalSection>

            <LegalSection title="3. Data Sharing">
                <p>We do <strong>NOT</strong> sell your data.</p>
                <p>We may share data with trusted third parties for service operations:</p>
                <LegalList items={[
                    "Payment providers (Razorpay, Stripe)",
                    "Hosting providers",
                ]} />
            </LegalSection>

            <LegalSection title="4. Cookies">
                <p>We use cookies to enhance your experience. Specifically for:</p>
                <LegalList items={[
                    "Authentication and session management",
                    "Overall platform analytics",
                ]} />
            </LegalSection>

            <LegalSection title="5. Data Security">
                <p>We implement and maintain industry-standard security measures to protect your data from unauthorized access, use, or disclosure.</p>
            </LegalSection>

            <LegalSection title="6. Your Rights">
                <p>You have the right to control your personal data. You can:</p>
                <LegalList items={[
                    "Request complete data deletion",
                    "Access and update your information anytime",
                ]} />
            </LegalSection>

            <LegalSection title="7. Retention">
                <p>We retain your data only for as long as needed to provide our services and fulfill the purposes outlined in this policy.</p>
            </LegalSection>

            <LegalSection title="8. Contact">
                <p>For any privacy-related concerns or inquiries, you can reach us at: <a href="mailto:support@quvolt.com" className="text-[var(--qb-primary)] hover:underline font-bold">support@quvolt.com</a></p>
            </LegalSection>
        </LegalLayout>
    );
}
