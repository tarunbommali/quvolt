import { BarChart3, Bolt, Coins, Lock, Radio, Shield, TrendingUp, Users, Zap, Globe, Layout, Layers, ShieldCheck } from 'lucide-react';

export const features = [
    {
        title: 'Real-time Infrastructure',
        description: 'Dedicated scaling with Redis-backed session persistence for zero-lag leaderboard updates.',
        icon: Zap,
    },
    {
        title: 'Monetization Engine',
        description: 'Built-in ticketing system with Razorpay integration. Track revenue and automate host payouts.',
        icon: Coins,
    },
    {
        title: 'AI Intelligence',
        description: 'Auto-generate balanced quizzes, difficulty levels, and smart question suggestions in seconds.',
        icon: BarChart3,
    },
    {
        title: 'Smart Analytics',
        description: 'Question-level drop-off analysis, session replays, and participant performance insights.',
        icon: TrendingUp,
    },
    {
        title: 'Global Delivery',
        description: 'Low-latency quiz delivery across 20+ regions. Perfect for international live events.',
        icon: Globe,
    },
    {
        title: 'Verified Security',
        description: 'Bank-grade encryption and secure access codes to prevent unauthorized joins.',
        icon: ShieldCheck,
    },
];

export const trustPoints = [
    { label: 'SLA-backed 99.9% Uptime', icon: ShieldCheck },
    { label: 'Bank-grade Data Encryption', icon: Lock },
    { label: 'Real-time WebSocket Scaling', icon: Globe },
    { label: 'Cross-Device Responsiveness', icon: Shield },
];

export const steps = [
    { title: 'Create & AI Suggest', description: 'Design engaging assessments or use AI to generate balanced questions.' },
    { title: 'Secure Launch', description: 'Go live instantly or schedule sessions with invite-only access codes.' },
    { title: 'Orchestrate Live', description: 'Manage the lifecycle from waiting rooms to real-time sync leaderboards.' },
    { title: 'Monetize & Analyze', description: 'Sell tickets, track payouts, and download question-level analytics.' },
];

export const plans = [
    {
        name: 'Free',
        price: '₹0',
        period: '/month',
        points: [
            'Up to 5 Quizzes',
            '10,000 Participants / Month',
            '1 Concurrent Live Session',
            '200 Participants per Session',
            'Basic Analytics Dashboard',
            'Limited Session Insights',
            'Quvolt Watermark (Mandatory)',
        ],
        commission: '25% Platform Commission',
        ctaLabel: 'Start for Free',
        badge: 'Trial',
    },
    {
        name: 'Creator',
        price: '₹499',
        period: '/month',
        featured: true,
        tagline: 'Power User Tier',
        audience: 'For trainers, educators & influencers',
        points: [
            'Up to 30 Quizzes',
            '50,000 Participants / Month',
            '3 Concurrent Live Sessions',
            '1,000 Participants per Session',
            'Advanced Analytics & Insights',
            'Exportable Performance Reports',
            'Audience & Engagement Tracking',
            'AI Quiz Generation & Logic',
            'Custom Branding (Logo + Colors)',
            'No Quvolt Watermark',
        ],
        commission: 'Reduced 10% Commission',
        ctaLabel: 'Get Creator Access',
        badge: 'Most Popular',
    },
    {
        name: 'Teams',
        price: '₹999',
        period: '/month',
        tagline: 'Institution Layer',
        audience: 'For universities & organizations',
        points: [
            'Unlimited Quizzes & Traffic',
            'Unlimited Concurrent Sessions',
            '10,000+ Participants per Session',
            'Enterprise Analytics Suite',
            'Custom Reports & API Access',
            'Organization-Level Insights',
            'Multi-Host Shared Libraries',
            'Advanced RBAC & Roles',
            'White-Label (Custom Domain)',
        ],
        commission: 'Lowest 5% Commission',
        ctaLabel: 'Coming Soon',
        badge: 'Enterprise',
        isComingSoon: true,
    },
];



export const faqData = [
    {
        question: 'What is QuVolt?',
        answer: 'QuVolt is a gamified learning platform that helps you master any skill through interactive quizzes and challenges.',
    },
    {
        question: 'How does QuVolt work?',
        answer: 'QuVolt uses spaced repetition and adaptive difficulty to create personalized learning paths. You earn points, badges, and rewards as you progress.',
    },
    {
        question: 'Is QuVolt free to use?',
        answer: 'Yes, QuVolt offers a free tier with access to all basic features. Premium subscriptions unlock advanced analytics, exclusive content, and ad-free learning.',
    },
    {
        question: 'Can I create my own quizzes?',
        answer: 'Yes, QuVolt allows you to create and share custom quizzes with your friends or the entire community.',
    },
    {
        question: 'How do I track my progress?',
        answer: 'QuVolt provides detailed progress tracking with insights into your strengths and weaknesses.',
    },
];