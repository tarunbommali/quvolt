import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, PartyPopper } from 'lucide-react';
import Motion from 'framer-motion';

const SubscriptionSuccessPage = () => {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 size={48} className="text-emerald-500" />
                        </div>
                        <div className="absolute -top-2 -right-2">
                            <PartyPopper size={32} className="text-amber-400 animate-bounce" />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-semibold theme-text-primary">Welcome, Creator! 🚀</h1>
                    <p className="theme-text-secondary opacity-80 leading-relaxed">
                        Your subscription is now active. You have unlocked live sessions, monetization tools, and advanced analytics.
                    </p>
                </div>

                <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="theme-text-muted">Current Plan</span>
                        <span className="font-semibold text-indigo-400">Creator Tier</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="theme-text-muted">Status</span>
                        <span className="font-semibold text-emerald-500">Active</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        to="/studio"
                        className="btn-premium w-full py-4 rounded-2xl font-semibold uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20"
                    >
                        Go to Studio
                    </Link>
                    <Link
                        to="/billing"
                        className="theme-text-muted hover:theme-text-primary text-sm font-medium transition-colors"
                    >
                        View Billing Details
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionSuccessPage;
