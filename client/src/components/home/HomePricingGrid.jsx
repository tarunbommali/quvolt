import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import Section from '../layout/Section';
import Container from '../layout/Container';
import { buttonStyles } from '../../styles/buttonStyles';

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

const stagger = {
    visible: {
        transition: {
            staggerChildren: 0.1,
        },
    },
};

/**
 * Home pricing plan cards.
 * @param {{ plans: Array<{ name: string, price: string, featured?: boolean, points: string[] }> }} props
 */
const HomePricingGrid = ({ plans }) => {
    return (
        <Section>
            <Container>
                <Motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-6"
                >
                    {plans.map((plan) => (
                        <PricingCard key={plan.name} plan={plan} />
                    ))}
                </Motion.div>
            </Container>
        </Section>
    );
};

const PricingCard = ({ plan }) => (
    <Motion.div
        variants={fadeUp}
        whileHover={{ y: -8 }}
        className={`rounded-2xl p-6 border transition-all ${
            plan.featured
                ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl'
                : 'border-gray-200 dark:border-gray-700'
        } bg-white dark:bg-gray-800`}
    >
        {plan.featured ? (
            <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                Most Popular
            </span>
        ) : null}

        <h3 className="text-xl font-bold mt-3">{plan.name}</h3>
        <p className="text-3xl font-bold mt-2">{plan.price}</p>

        <ul className="mt-4 space-y-2 text-sm">
            {plan.points.map((point) => (
                <li key={point} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-indigo-500" />
                    {point}
                </li>
            ))}
        </ul>

        <Link
            to="/register"
            className={`${buttonStyles.base} ${plan.featured ? buttonStyles.primary : buttonStyles.secondary} mt-5 w-full justify-center`}
        >
            Get Started
        </Link>
    </Motion.div>
);

export default HomePricingGrid;
