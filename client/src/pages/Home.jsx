import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, Coins, Radio, Shield, Users, Zap } from 'lucide-react';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import { buttonStyles } from '../styles/buttonStyles';
import { useAuthStore } from '../stores/useAuthStore';

const features = [
    {
        title: 'Backend-owned lifecycle engine',
        description: 'Session transitions are enforced server-side across draft, scheduled, waiting, live, completed, and aborted states.',
        icon: Radio,
    },
    {
        title: 'Realtime orchestration',
        description: 'Organizer controls, participant submissions, and leaderboard updates run live over Socket.IO with reconnect handling.',
        icon: Zap,
    },
    {
        title: 'AI quiz generation',
        description: 'Generate quiz sets with controlled difficulty distribution and save directly into studio workflows.',
        icon: BarChart3,
    },
    {
        title: 'Paid quizzes + subscriptions',
        description: 'Support one-time quiz payments and recurring plans with create-order, verify, and webhook-safe flows.',
        icon: Coins,
    },
    {
        title: 'Host onboarding and payouts',
        description: 'Host account setup, payout summaries, and revenue breakdowns are available through the payment-service layer.',
        icon: Shield,
    },
    {
        title: 'Role-aware analytics + history',
        description: 'Organizer and participant analytics, history views, participant exports, and session stats are built into the core API.',
        icon: Users,
    },
];

const steps = [
    { title: 'Author in Studio', description: 'Create quizzes, add questions, and save full quiz state from organizer tools.' },
    { title: 'Schedule or launch', description: 'Move sessions through guarded lifecycle transitions based on organizer intent.' },
    { title: 'Run live in realtime', description: 'Participants join with code while hosts control pacing, pause/resume, and reveals.' },
    { title: 'Analyze and monetize', description: 'Review analytics/history and manage paid access, subscriptions, and payouts.' },
];

const plans = [
    {
        name: 'Free',
        price: '₹0/month',
        description: 'Perfect for educators just getting started.',
        points: ['25% platform commission', 'Up to 5 free quizzes', 'Unlimited paid quizzes', 'Up to 10k participants'],
    },
    {
        name: 'Creator',
        price: '₹499/month',
        description: 'For creators ready to monetize their expertise.',
        points: ['10% platform commission', 'Up to 15 free quizzes', 'Unlimited paid quizzes', 'Up to 15k participants'],
        featured: true,
    },
    {
        name: 'Teams',
        price: '₹999/month',
        description: 'Built for organizations running high-volume training.',
        points: ['5% platform commission', 'Up to 25 free quizzes', 'Unlimited paid quizzes', 'Up to 25k participants'],
    },
];

const Home = () => {
    const user = useAuthStore((state) => state.user);

    return (
        <div className="app-page bg-gray-50 space-y-12 pb-12 dark:bg-gray-900">
            <Section className="mt-0">
                <Container>
                    <div className="max-w-4xl mx-auto text-center space-y-4 py-16">
                        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">
                            Real-time quizzes that engage and improve performance.
                        </h1>
                        <p className="text-sm text-gray-500 max-w-2xl mx-auto dark:text-gray-400">
                            Quvolt is a real-time quiz platform for live sessions, AI-assisted content creation, secure access control, and actionable analytics — built for educators, teams, and organizations.
                        </p>
                        <div className="flex gap-3 justify-center flex-wrap">
                            <Link to={user ? '/studio' : '/register'} className={`${buttonStyles.base} ${buttonStyles.primary}`}>
                                {user ? 'Open Studio' : 'Start for free'}
                            </Link>
                            <Link to="/join" className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
                                Join a session
                            </Link>
                        </div>
                    </div>
                </Container>
            </Section>

            <Section id="features">
                <Container>
                    <div className="space-y-4 text-center max-w-3xl mx-auto">
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Why Quvolt</p>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Everything you need to teach, engage, and grow.</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            These capabilities map directly to the implemented services in this repo: client, server, and payment-service.
                        </p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <article key={feature.title} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2 dark:bg-gray-800 dark:border-gray-700">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                                        <Icon size={16} />
                                    </div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{feature.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{feature.description}</p>
                                </article>
                            );
                        })}
                    </div>
                </Container>
            </Section>

            <Section id="how-it-works">
                <Container>
                    <div className="space-y-4 text-center max-w-3xl mx-auto">
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">How it works</p>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Up and running in minutes.</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Use the same flow as the live product: create, schedule/launch, run live, then review outcomes.</p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {steps.map((step, index) => (
                            <article key={step.title} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2 dark:bg-gray-800 dark:border-gray-700">
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium dark:bg-indigo-900/30 dark:text-indigo-300">
                                    {index + 1}
                                </span>
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{step.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
                            </article>
                        ))}
                    </div>
                </Container>
            </Section>

            <Section id="pricing">
                <Container>
                    <div className="space-y-4 text-center max-w-3xl mx-auto">
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Pricing</p>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Simple, transparent pricing.</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Plan limits and commission rates match the current billing implementation.</p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {plans.map((plan) => (
                            <article
                                key={plan.name}
                                className={`bg-white border rounded-2xl p-4 space-y-3 dark:bg-gray-800 ${plan.featured ? 'border-indigo-400 dark:border-indigo-500' : 'border-gray-200 dark:border-gray-700'}`}
                            >
                                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{plan.price}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
                                <ul className="space-y-2">
                                    {plan.points.map((point) => (
                                        <li key={point} className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <CheckCircle2 size={14} className="mt-0.5 text-indigo-600 dark:text-indigo-400" />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/register" className={`${buttonStyles.base} ${plan.featured ? buttonStyles.primary : buttonStyles.secondary} w-full`}>
                                    Choose {plan.name}
                                </Link>
                            </article>
                        ))}
                    </div>
                </Container>
            </Section>

            <Section>
                <Container>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center space-y-3 max-w-4xl mx-auto dark:bg-gray-800 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Start teaching, earning, and growing today.</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Launch from Studio, run live sessions, and track analytics and revenue in one connected product.</p>
                        <div className="flex gap-3 justify-center flex-wrap">
                            <Link to={user ? '/studio' : '/register'} className={`${buttonStyles.base} ${buttonStyles.primary}`}>
                                {user ? 'Go to dashboard' : 'Get started free'}
                            </Link>
                            <Link to={user ? '/analytics' : '/login'} className={`${buttonStyles.base} ${buttonStyles.secondary}`}>
                                {user ? 'View analytics' : 'Log in'}
                            </Link>
                        </div>
                    </div>
                </Container>
            </Section>
        </div>
    );
};

export default Home;
 