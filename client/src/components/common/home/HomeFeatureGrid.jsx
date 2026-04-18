import { motion as Motion } from 'framer-motion';
import Section from '../../layout/Section';
import Container from '../../layout/Container';

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
 * Home feature cards.
 * @param {{ features: Array<{ title: string, description: string, icon: React.ComponentType }> }} props
 */
const HomeFeatureGrid = ({ features }) => {
    return (
        <Section>
            <Container>
                <Motion.div
                    initial="hidden"
                    whileInView="visible"
                    variants={stagger}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-6"
                >
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} {...feature} />
                    ))}
                </Motion.div>
            </Container>
        </Section>
    );
};

const FeatureCard = ({ icon: Icon, title, description }) => (
    <Motion.div
        variants={fadeUp}
        whileHover={{ y: -8, scale: 1.02 }}
        className="group bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-2xl p-6 transition-all shadow-sm hover:shadow-xl"
    >
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 mb-4">
            <Icon size={20} />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {description}
        </p>
    </Motion.div>
);

export default HomeFeatureGrid;
