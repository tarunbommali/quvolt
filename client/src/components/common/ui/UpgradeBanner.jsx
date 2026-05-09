import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

const UpgradeBanner = () => (
  <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col md:flex-row justify-between items-center gap-4">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
        <Sparkles className="text-indigo-400" size={24} />
      </div>
      <div>
        <p className="font-semibold text-lg theme-text-primary">
          Upgrade to Creator 🚀
        </p>
        <p className="text-sm theme-text-secondary opacity-70">
          Unlock live sessions, AI quiz generation, and ticket monetization.
        </p>
      </div>
    </div>

    <Link
      to="/upgrade"
      className="btn-premium px-8 py-3 rounded-2xl text-[12px] font-semibold uppercase tracking-widest shadow-lg shadow-indigo-500/20 whitespace-nowrap"
    >
      Upgrade Plan
    </Link>
  </div>
);

export default UpgradeBanner;
