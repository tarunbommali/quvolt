import React from 'react'
import { CheckCircle2 } from 'lucide-react';

const PricingListItem = ({ point, plan }) => {
    return (
        <li className="flex items-start gap-3 group/item">
            <CheckCircle2
                size={20}
                className={`mt-1 shrink-0 ${plan.featured ? 'text-indigo-400' : 'text-[var(--qb-primary)]'
                    } group-hover/item:scale-110 transition-transform`}
            />
            <span className="text-[14px] font-medium theme-text-secondary leading-snug">
                {point}
            </span>
        </li>
    )
}

export default PricingListItem