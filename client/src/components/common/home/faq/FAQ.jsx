import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';
import { faqData } from '../homeData';

const FAQ = () => {
    const [activeIndex, setActiveIndex] = useState(null);

    const toggle = (index) => {
        setActiveIndex(activeIndex === index ? null : index);
    };

    return (
        <section className="py-24">
            <div className="max-w-4xl mx-auto px-6">

                {/* Heading */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-semibold theme-text-primary">
                        Frequently Asked Questions
                    </h2>
                    <p className="mt-4 text-lg theme-text-secondary opacity-80">
                        Everything you need to know about Quvolt
                    </p>
                </div>

                {/* Accordion */}
                <div className="space-y-4">
                    {faqData.map((item, index) => {
                        const isOpen = activeIndex === index;

                        return (
                            <div
                                key={index}
                                className={`rounded-3xl border transition-all duration-300 ${isOpen
                                    ? 'border-indigo-500/40 shadow-[0_10px_40px_rgba(99,102,241,0.15)]'
                                    : 'border-white/10'
                                    } bg-white/5 backdrop-blur-xl`}
                            >
                                {/* Question */}
                                <button
                                    onClick={() => toggle(index)}
                                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                                >
                                    <span className="text-lg font-semibold theme-text-primary">
                                        {item.question}
                                    </span>

                                    <span className="ml-4 text-indigo-400">
                                        {isOpen ? <Minus size={20} /> : <Plus size={20} />}
                                    </span>
                                </button>

                                {/* Answer */}
                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <Motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-6 pb-6 text-sm theme-text-secondary leading-relaxed">
                                                {item.answer}
                                            </div>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FAQ;