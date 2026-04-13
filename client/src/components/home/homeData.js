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
