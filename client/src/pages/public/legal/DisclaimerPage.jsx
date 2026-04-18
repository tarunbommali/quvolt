import LegalLayout, { LegalSection, LegalList } from './LegalLayout';

export default function DisclaimerPage() {
    return (
        <LegalLayout title="Disclaimer" lastUpdated={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}>
            <div className="space-y-4 text-sm md:text-base font-medium theme-text-secondary leading-relaxed mb-8">
                <p>By using <strong>Quvolt</strong>, you agree to the conditions outlined in this disclaimer.</p>
            </div>

            <LegalSection title="1. General">
                <p>Quvolt is provided on an &quot;as is&quot; and &quot;as available&quot; basis without any warranties of any kind, whether express, implied, statutory, or otherwise.</p>
            </LegalSection>

            <LegalSection title="2. No Guarantees">
                <p>While we strive for excellence, we strictly do not guarantee:</p>
                <LegalList items={[
                    "100% uptime or continuous availability",
                    "Completely error-free operation of the platform",
                ]} />
            </LegalSection>

            <LegalSection title="3. Limitation of Liability">
                <p>In no event shall Quvolt be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:</p>
                <LegalList items={[
                    "Loss of data or information",
                    "Business interruption or revenue loss",
                    "Any damages resulting from the use or inability to use the service",
                ]} />
            </LegalSection>

            <LegalSection title="4. External Services">
                <p>Our platform may contain links to or integrate with external, third-party services. We are not responsible for the content, privacy policies, or practices of any third-party services.</p>
            </LegalSection>

            <LegalSection title="5. Contact">
                <p>If you have any questions regarding this Disclaimer, please reach out to: <a href="mailto:support@quvolt.com" className="text-[var(--qb-primary)] hover:underline font-bold">support@quvolt.com</a></p>
            </LegalSection>
        </LegalLayout>
    );
}
