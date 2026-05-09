import { Link } from 'react-router-dom';
import Section from '../../layout/Section';
import Container from '../../layout/Container';

/**
 * Home bottom call-to-action banner.
 * @param {{ user: { _id?: string } | null }} props
 */
const HomeCtaBanner = ({ user }) => {
    return (
        <Section className="relative w-full overflow-hidden text-center py-24 bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 rounded-[3rem] text-white shadow-[0_30px_100px_rgba(79,70,229,0.4)] border border-white/10 rounded-none">
            <Container >
                <div >
                    <div className="relative z-10 px-6">
                        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight font-semibold font-saas leading-[1.1]">
                            Launch your next viral <br className="hidden md:block" /> quiz in minutes 🚀
                        </h2>
                        <p className="mt-8 text-xl text-indigo-100/80 max-w-2xl mx-auto font-medium leading-relaxed">
                            Join thousands of educators and world-class creators building the next generation of real-time audience engagement.
                        </p>

                        <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-5">
                            <Link
                                to={user ? '/workspace' : '/register'}
                                className="bg-white text-indigo-700 px-12 py-5 rounded-2xl font-semibold uppercase tracking-[0.2em] text-[13px] hover:scale-105 transition-transform shadow-2xl w-full sm:w-auto"
                            >
                                Get Started Free
                            </Link>
                            <Link
                                to="/join"
                                className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-12 py-5 rounded-2xl font-semibold uppercase tracking-[0.2em] text-[13px] hover:bg-white/20 transition-all w-full sm:w-auto"
                            >
                                Watch Demo
                            </Link>
                        </div>
                    </div>
                </div>
            </Container>
        </Section>
    );
};

export default HomeCtaBanner;
