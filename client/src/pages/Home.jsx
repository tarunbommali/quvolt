/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-syntax */
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  Coins,
  Radio,
  Shield,
  Users,
  Zap,
  Lock,
  Bolt,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Container from '../components/layout/Container';
import Section from '../components/layout/Section';
import { buttonStyles } from '../styles/buttonStyles';
import { useAuthStore } from '../stores/useAuthStore';

/* ---------------- ANIMATION VARIANTS ---------------- */

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

/* ---------------- DATA ---------------- */

const features = [
  {
    title: 'Backend-driven lifecycle',
    description:
      'Control every quiz stage with precision — from draft to live to completed.',
    icon: Radio,
  },
  {
    title: 'Real-time orchestration',
    description:
      'Run live sessions with instant sync and seamless leaderboard updates.',
    icon: Zap,
  },
  {
    title: 'AI-powered quiz creation',
    description:
      'Generate quizzes with balanced difficulty in seconds.',
    icon: BarChart3,
  },
  {
    title: 'Monetization ready',
    description:
      'Launch paid quizzes and subscriptions with built-in billing.',
    icon: Coins,
  },
  {
    title: 'Creator onboarding',
    description:
      'Manage creators, track earnings, and automate payouts.',
    icon: Users,
  },
  {
    title: 'Advanced analytics',
    description:
      'Track performance, engagement, and behavior with deep insights.',
    icon: TrendingUp,
  },
];

const trustPoints = [
  { label: 'Zero-lag real-time engine', icon: Bolt },
  { label: 'Cheat-resistant assessments', icon: Lock },
  { label: 'Deep performance analytics', icon: TrendingUp },
  { label: 'Works across all devices', icon: Shield },
];

const steps = [
  { title: 'Create', description: 'Build quizzes in seconds.' },
  { title: 'Launch', description: 'Go live or schedule.' },
  { title: 'Engage', description: 'Run sessions in real-time.' },
  { title: 'Analyze', description: 'Track performance & monetize.' },
];

const plans = [
  {
    name: 'Free',
    price: '₹0/mo',
    points: ['25% commission', '5 quizzes', '10k participants'],
  },
  {
    name: 'Creator',
    price: '₹499/mo',
    featured: true,
    points: ['10% commission', '15 quizzes', '15k participants'],
  },
  {
    name: 'Teams',
    price: '₹999/mo',
    points: ['5% commission', '25 quizzes', '25k participants'],
  },
];

/* ---------------- REUSABLE COMPONENTS ---------------- */

const FeatureCard = ({ icon: Icon, title, description }) => (
  <motion.div
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
  </motion.div>
);

const PricingCard = ({ plan }) => (
  <motion.div
    variants={fadeUp}
    whileHover={{ y: -8 }}
    className={`rounded-2xl p-6 border transition-all ${
      plan.featured
        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl'
        : 'border-gray-200 dark:border-gray-700'
    } bg-white dark:bg-gray-800`}
  >
    {plan.featured && (
      <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
        Most Popular
      </span>
    )}

    <h3 className="text-xl font-bold mt-3">{plan.name}</h3>
    <p className="text-3xl font-bold mt-2">{plan.price}</p>

    <ul className="mt-4 space-y-2 text-sm">
      {plan.points.map((p) => (
        <li key={p} className="flex items-center gap-2">
          <CheckCircle2 size={14} className="text-indigo-500" />
          {p}
        </li>
      ))}
    </ul>

    <Link
      to="/register"
      className={`${buttonStyles.base} ${
        plan.featured
          ? buttonStyles.primary
          : buttonStyles.secondary
      } mt-5 w-full justify-center`}
    >
      Get Started
    </Link>
  </motion.div>
);

/* ---------------- MAIN COMPONENT ---------------- */

const Home = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="relative bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* BACKGROUND GLOW */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute w-[700px] h-[700px] bg-indigo-500/20 blur-3xl rounded-full top-[-20%] left-1/2 -translate-x-1/2" />
      </div>

      {/* HERO */}
      <Section>
        <Container>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="text-center py-24 max-w-4xl mx-auto"
          >
            <motion.h1
              variants={fadeUp}
              className="text-5xl md:text-6xl font-bold tracking-tight"
            >
              Real-time quizzes —{' '}
              <span className="bg-gradient-to-r from-indigo-500 to-blue-500 text-transparent bg-clip-text">
                fast, fair, scalable
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-gray-600 dark:text-gray-300"
            >
              Engage thousands of users instantly with zero lag and
              deep performance insights.
            </motion.p>

            <motion.div
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
            </motion.div>
          </motion.div>
        </Container>
      </Section>

      {/* TRUST */}
      <Section>
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {trustPoints.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.label}
                  className="flex flex-col items-center gap-2"
                >
                  <Icon className="text-indigo-500" />
                  <span className="text-sm">{p.label}</span>
                </div>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* FEATURES */}
      <Section>
        <Container>
          <motion.div
            initial="hidden"
            whileInView="visible"
            variants={stagger}
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* HOW IT WORKS */}
      <Section>
        <Container>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            className="grid md:grid-cols-4 gap-6"
          >
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="p-6 bg-white dark:bg-gray-800 rounded-xl text-center"
              >
                <div className="text-indigo-600 font-bold text-xl">
                  {i + 1}
                </div>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* PRICING */}
      <Section>
        <Container>
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            className="grid md:grid-cols-3 gap-6"
          >
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </motion.div>
        </Container>
      </Section>

      {/* CTA */}
      <Section>
        <Container>
          <div className="text-center py-16 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl text-white">
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
    </div>
  );
};

export default Home;