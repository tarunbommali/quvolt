import { Zap, Shield, BarChart3, Coins, Radio, LayoutDashboard } from 'lucide-react';

const marketingFeatures = [
    {
        title: 'Real-Time Quiz Engine',
        description: 'Host fast, low-latency quiz sessions with live participant updates, synchronized timers, and instant scoring.',
        icon: Radio,
    },
    {
        title: 'Flexible Quiz Creation',
        description: 'Build single quizzes or structured learning collections with configurable pacing, pricing, and access rules.',
        icon: Zap,
    },
    {
        title: 'Hybrid Monetization',
        description: 'Combine paid quizzes with subscription plans and dynamic commission rates built for creator-first earnings.',
        icon: Coins,
    },
    {
        title: 'Analytics Dashboard',
        description: 'Track participant behavior, quiz performance, revenue, and payouts through role-based dashboards.',
        icon: BarChart3,
    },
    {
        title: 'Secure Payment Flow',
        description: 'Protect transactions with backend-calculated pricing, verified webhooks, and role-based payment access.',
        icon: Shield,
    },
    {
        title: 'Scalable Experience',
        description: 'Deliver a responsive quiz experience across devices with real-time state management and clean workflows.',
        icon: LayoutDashboard,
    },
];

const pricingPlans = [
    {
        name: 'Free',
        price: '₹0/month',
        tagline: 'Start hosting instantly without upfront costs',
        cta: 'Start Free',
        href: '/register',
        featured: false,
        points: [
            '25% Platform Commission',
            'Up to 5 Free Quizzes',
            'Unlimited Paid Quizzes',
            'Up to 10k Participants (Join Room)'
        ],
    },
    {
        name: 'Pro',
        price: '₹499/month',
        tagline: 'Ideal for frequent educators and creators',
        cta: 'Upgrade to Pro',
        href: '/register',
        featured: true,
        points: [
            '10% Platform Commission',
            'Up to 15 Free Quizzes',
            'Unlimited Paid Quizzes',
            'Up to 15K Participants (Join Room)'
        ],
    },
    {
        name: 'Premium',
        price: '₹999/month',
        tagline: 'Maximized revenue and massive scale',
        cta: 'Get Premium',
        href: '/register',
        featured: false,
        points: [
            '5% Platform Commission',
            'Up to 25 Free Quizzes',
            'Unlimited Paid Quizzes',
            'Up to 25k Participants (Join Room)'
        ],
    },
];

export { marketingFeatures, pricingPlans };
