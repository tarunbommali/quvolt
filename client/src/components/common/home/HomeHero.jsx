import { Link } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import Section from '../../layout/Section';
import Container from '../../layout/Container';
import { buttonStyles } from '../../../styles/index';

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
};

const stagger = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.1,
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
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={stagger}
                    className="relative text-center py-20 md:py-28 max-w-5xl mx-auto"
                >
                    {/* Background Glow */}
                    <div className="absolute inset-0 -z-20 pointer-events-none">
                        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-indigo-600/15 blur-[80px] md:blur-[120px] rounded-full opacity-60 md:opacity-100" />
                    </div>

                    <Motion.h1
                        variants={fadeUp}
                        className="text-4xl md:text-7xl font-semibold tracking-tight theme-text-primary leading-[1.05]"
                    >
                        Launch & Monetize{' '}
                        <span className="bg-gradient-to-r from-indigo-400 via-indigo-500 to-cyan-400 text-transparent bg-clip-text">
                            Your Live Quiz Shows
                        </span>
                    </Motion.h1>

                    <Motion.p
                        variants={fadeUp}
                        className="mt-8 text-lg md:text-xl theme-text-secondary max-w-2xl mx-auto leading-relaxed"
                    >
                        The all-in-one platform for creators to run zero-lag live quizzes, sell tickets, and engage thousands of participants in real-time.
                    </Motion.p>

                    <Motion.div
                        variants={fadeUp}
                        className="flex flex-col sm:flex-row justify-center items-center gap-5 mt-12"
                    >
                        <Link
                            to={user ? '/workspace' : '/register'}
                            className="btn-premium px-10 py-4.5 h-auto theme-radius-card text-[13px] font-semibold uppercase tracking-[0.2em] shadow-[0_10px_40px_rgba(99,102,241,0.4)]"
                        >
                            Start Free
                        </Link>

                        <Link
                            to="/join"
                            className="theme-surface border border-white/10 px-10 py-4.5 h-auto theme-radius-card text-[13px] font-medium theme-text-secondary hover:bg-white/5 transition-all uppercase tracking-[0.2em]"
                        >
                            Watch Demo
                        </Link>
                    </Motion.div>
                </Motion.div>
            </Container>
        </Section>
    );
};

export default HomeHero;
