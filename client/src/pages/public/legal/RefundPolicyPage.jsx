

import LegalLayout, { LegalSection, LegalList } from './LegalLayout';
import { typography, cx } from '../../../styles/index';

export default function RefundPolicyPage() {
    return (
        <LegalLayout title="Refund & Cancellation Policy" lastUpdated={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}>
            <div className={cx(typography.body, "mb-8 leading-relaxed")}>
                <p>Thank you for choosing <strong className={typography.bodyStrong}>Quvolt</strong>. We want to ensure that your experience with our platform is seamless and clear regarding billing and refunds.</p>
            </div>

            <LegalSection title="1. Subscriptions">
                <LegalList items={[
                    "All subscriptions are billed in advance",
                    "No partial refunds or credits will be provided for partial months of service",
                ]} />
            </LegalSection>

            <LegalSection title="2. Refund Eligibility">
                <p>Refunds may be issued only under the following conditions:</p>
                <LegalList items={[
                    "Payment was duplicated due to a technical error",
                    "Service was entirely unavailable due to our fault for an extended period",
                ]} />
            </LegalSection>

            <LegalSection title="3. Non-Refundable Cases">
                <p>We do not issue refunds for the following reasons:</p>
                <LegalList items={[
                    "Change of mind after purchasing a subscription",
                    "Unused features or lack of usage during a subscription period",
                    "Network issues or connectivity problems on the user's side",
                ]} />
            </LegalSection>

            <LegalSection title="4. Cancellation">
                <LegalList items={[
                    "You can cancel your subscription anytime from your account settings",
                    "After cancellation, your access to premium features continues until your current billing cycle ends",
                ]} />
            </LegalSection>

            <LegalSection title="5. Processing Time">
                <p>Refunds (if approved) are processed and credited to the original payment method within <strong>5–10 business days</strong>, depending on your financial institution.</p>
            </LegalSection>

            <LegalSection title="6. Contact">
                <p>If you believe you are eligible for a refund, please contact us at: <a href="mailto:support@quvolt.com" className="text-[var(--qb-primary)] hover:underline font-bold">support@quvolt.com</a></p>
            </LegalSection>
        </LegalLayout>
    );
}
