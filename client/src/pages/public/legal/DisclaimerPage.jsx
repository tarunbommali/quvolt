

import LegalLayout, { LegalSection, LegalList } from './LegalLayout';
import { typography, cx } from '../../../styles/index';

export default function DisclaimerPage() {
    return (
        <LegalLayout title="Disclaimer" lastUpdated={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}>
            <div className={cx(typography.body, "mb-8 leading-relaxed")}>
                <p>This Disclaimer contains important information regarding your use of <strong className={typography.bodyStrong}>Quvolt</strong>.</p>
            </div>

            <LegalSection title="1. General">
                <p className={typography.body}>Quvolt is provided on an &quot;as is&quot; and &quot;as available&quot; basis without any warranties of any kind, whether express, implied, statutory, or otherwise.</p>
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
                <p>If you have any questions regarding this Disclaimer, please reach out to: <a href="mailto:support@quvolt.com" className={typography.link}>support@quvolt.com</a></p>
            </LegalSection>
        </LegalLayout>
    );
}
