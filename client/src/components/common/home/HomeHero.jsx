import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import Section from '../../layout/Section';
import Container from '../../layout/Container';
import { buttonStyles } from '../../../styles/buttonStyles';

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
 * Home hero section.
 * @param {{ user: { _id?: string } | null }} props
 */
const HomeHero = ({ user }) => {
    return (
        <Section>
            <Container>
                <Motion.div
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    className="text-center py-24 max-w-4xl mx-auto"
                >
                    <Motion.h1
                        variants={fadeUp}
                        className="text-5xl md:text-6xl font-bold tracking-tight"
                    >
                        Real-time quizzes -{' '}
                        <span className="bg-linear-to-r from-indigo-500 to-blue-500 text-transparent bg-clip-text">
                            fast, fair, scalable
                        </span>
                    </Motion.h1>

                    <Motion.p
                        variants={fadeUp}
                        className="mt-6 text-lg text-gray-600 dark:text-gray-300"
                    >
                        Engage thousands of users instantly with zero lag and deep performance insights.
                    </Motion.p>

                    <Motion.div
                        variants={fadeUp}
                        className="flex justify-center gap-4 mt-8"
                    >
                        <Link
                            to={user ? '/studio' : '/register'}
                            className={`${buttonStyles.base} ${buttonStyles.primary}`}
                        >
                            Start Free
                        </Link>

                        <Link
                            to="/join"
                            className={`${buttonStyles.base} ${buttonStyles.secondary}`}
                        >
                            Join Session
                        </Link>
                    </Motion.div>
                </Motion.div>
            </Container>
        </Section>
    );
};

export default HomeHero;
