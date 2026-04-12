import { Link } from 'react-router-dom';
import Container from '../layout/Container';
import Section from '../layout/Section';

const NotFound = () => (
    <Container>
        <Section className="min-h-[64vh] flex flex-col items-center justify-center gap-4 text-center">
            <h2>404</h2>
            <p className="text-slate-500 font-semibold">The page you requested does not exist.</p>
            <Link to="/" className="btn-premium">Go Home</Link>
        </Section>
    </Container>
);

export default NotFound;
