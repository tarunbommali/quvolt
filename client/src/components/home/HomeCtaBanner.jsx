import { Link } from 'react-router-dom';
import Section from '../layout/Section';
import Container from '../layout/Container';

/**
 * Home bottom call-to-action banner.
 * @param {{ user: { _id?: string } | null }} props
 */
const HomeCtaBanner = ({ user }) => {
    return (
        <Section>
            <Container>
                <div className="text-center py-16 bg-linear-to-r from-indigo-600 to-blue-600 rounded-3xl text-white">
                    <h2 className="text-3xl font-bold">
                        Start engaging today
                    </h2>
                    <p className="mt-3 text-indigo-100">
                        Run live quizzes and scale effortlessly.
                    </p>

                    <div className="mt-6 flex justify-center gap-4">
                        <Link
                            to={user ? '/studio' : '/register'}
                            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-semibold"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </Container>
        </Section>
    );
};

export default HomeCtaBanner;
