import { motion as Motion } from 'framer-motion';
import Section from '../layout/Section';
import Container from '../layout/Container';

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
 * Home step-by-step walkthrough.
 * @param {{ steps: Array<{ title: string, description: string }> }} props
 */
const HomeStepsGrid = ({ steps }) => {
    return (
        <Section>
            <Container>
                <Motion.div
                    variants={stagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-4 gap-6"
                >
                    {steps.map((step, index) => (
                        <Motion.div
                            key={step.title}
                            variants={fadeUp}
                            className="p-6 bg-white dark:bg-gray-800 rounded-xl text-center"
                        >
                            <div className="text-indigo-600 font-bold text-xl">
                                {index + 1}
                            </div>
                            <h3 className="mt-2 font-semibold">{step.title}</h3>
                            <p className="text-sm text-gray-500">{step.description}</p>
                        </Motion.div>
                    ))}
                </Motion.div>
            </Container>
        </Section>
    );
};

export default HomeStepsGrid;
