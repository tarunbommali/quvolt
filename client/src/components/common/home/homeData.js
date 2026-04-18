import { BarChart3, Bolt, Coins, Lock, Radio, Shield, TrendingUp, Users, Zap } from 'lucide-react';

export const features = [
    {
        title: 'Backend-driven lifecycle',
        description: 'Control every quiz stage with precision - from draft to live to completed.',
        icon: Radio,
    },
    {
        title: 'Real-time orchestration',
        description: 'Run live sessions with instant sync and seamless leaderboard updates.',
        icon: Zap,
    },
    {
        title: 'AI-powered quiz creation',
        description: 'Generate quizzes with balanced difficulty in seconds.',
        icon: BarChart3,
    },
    {
        title: 'Monetization ready',
        description: 'Launch paid quizzes and subscriptions with built-in billing.',
        icon: Coins,
    },
    {
        title: 'Creator onboarding',
        description: 'Manage creators, track earnings, and automate payouts.',
        icon: Users,
    },
    {
        title: 'Advanced analytics',
        description: 'Track performance, engagement, and behavior with deep insights.',
        icon: TrendingUp,
    },
];

export const trustPoints = [
    { label: 'Zero-lag real-time engine', icon: Bolt },
    { label: 'Cheat-resistant assessments', icon: Lock },
    { label: 'Deep performance analytics', icon: TrendingUp },
    { label: 'Works across all devices', icon: Shield },
];

export const steps = [
    { title: 'Create', description: 'Build quizzes in seconds.' },
    { title: 'Launch', description: 'Go live or schedule.' },
    { title: 'Engage', description: 'Run sessions in real-time.' },
    { title: 'Analyze', description: 'Track performance & monetize.' },
];

export const plans = [
    {
        name: 'Free',
        price: '₹0/month',
        tagline: 'Get started with core features',
        audience: 'Try the product risk-free',
        points: [
            'Up to 5 quizzes',
            'Up to 10,000 participants',
            'Basic analytics dashboard',
            'Public session hosting',
            'Standard support',
        ],
        commission: '25% platform commission',
        ctaLabel: 'Start Free',
    },
    {
        name: 'Creator',
        price: '₹499/month',
        featured: true,
        tagline: 'Scale your sessions with advanced tools',
        audience: 'Best for individual educators & creators',
        points: [
            'Up to 15 quizzes',
            'Up to 15,000 participants',
            'Advanced analytics & insights',
            'AI quiz generation',
            'Private session hosting',
            'Priority support',
        ],
        upgradeNote: '+ AI generation + better analytics',
        commission: 'Reduced 10% platform commission',
        ctaLabel: 'Upgrade to Creator',
    },
    {
        name: 'Teams',
        price: '₹999/month',
        tagline: 'Collaborate and manage at scale',
        audience: 'Built for organizations & institutions',
        points: [
            'Up to 25 quizzes',
            'Up to 25,000 participants',
            'Team collaboration (multi-host)',
            'Role-based access control',
            'Shared analytics dashboard',
            'Dedicated support',
        ],
        upgradeNote: '+ multi-host + collaboration',
        commission: 'Lowest 5% platform commission',
        ctaLabel: 'Choose Teams Plan',
    },
];
