import { motion as Motion } from 'framer-motion';
import Section from '../../../layout/Section';
import Container from '../../../layout/Container';
import FeatureCard from './FeatureCard'
const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
};

const stagger = {
    visible: {
        transition: {
            staggerChildren: 0.12,
        },
    },
};

const HomeFeatureGrid = ({ features }) => {
    return (
        <Section className="min-h-screen px-10 flex items-center">
            <Container>

                {/* Heading (IMPORTANT for UX) */}
                <Motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mt-20 mb-4"
                >
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight theme-text-primary leading-[1.1]">
                        Unmatched Power   for Modern Creators
                    </h2>
                    <p className="theme-text-secondary mt-2 max-w-2xl mx-auto text-lg md:text-xl font-semibold opacity-80 leading-relaxed">
                        Everything you need to create, launch, and monetize real-time quiz experiences with industry-leading stability.
                    </p>
                </Motion.div>

                {/* Grid */}
                <Motion.div
                    initial="hidden"
                    whileInView="visible"
                    variants={stagger}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-8"
                >
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} {...feature} />
                    ))}
                </Motion.div>

            </Container>
        </Section>
    );
};


export default HomeFeatureGrid;
