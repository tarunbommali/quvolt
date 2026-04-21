import React from 'react';

// ── Typography helpers (keeps JSX clean) ──────────────────────────────────────
export const Label = ({ children, className = '' }) => (
	<span className={`text-[10px] font-bold uppercase tracking-widest theme-text-muted ${className}`}>
		{children}
	</span>
);

export const Stat = ({ label, value, accent }) => (
	<div className="flex flex-col items-center gap-0.5">
		<Label>{label}</Label>
		<span className={`text-2xl font-black tabular-nums ${accent ?? 'theme-text-primary'}`}>{value}</span>
	</div>
);

// ── Page shell ─────────────────────────────────────────────────────────────────
export const Shell = ({ children }) => (
	<div className="min-h-screen theme-surface-soft theme-text-primary overflow-x-hidden font-sans">
		{children}
	</div>
);

// ── Centered card wrapper (loading / error / finished) ─────────────────────────
export const CenterCard = ({ children }) => (
	<div className="min-h-screen flex items-center justify-center p-6">
		<div className="w-full max-w-sm">{children}</div>
	</div>
);

// ── Simple token-based card ────────────────────────────────────────────────────
export const Card = ({ children, className = '' }) => (
	<div className={`surface-card rounded-2xl p-6 ${className}`}>{children}</div>
);

