import React from 'react'
import { CheckCircle2 } from 'lucide-react';
import { typography, cx } from '../../../../styles/index';

const PricingListItem = ({ point, plan }) => {
    return (
        <li className="flex items-start gap-3 group/item">
            <CheckCircle2
                size={14}
                className={cx(
                    "mt-1 shrink-0 transition-transform group-hover/item:scale-110",
                    plan.featured ? 'text-[var(--qb-primary)]' : 'text-slate-400'
                )}
            />
            <span className={cx(typography.small, "theme-text-secondary leading-snug")}>
                {point}
            </span>
        </li>
    )
}

export default PricingListItem