import { motion as Motion } from 'framer-motion';
import Section from '../../../layout/Section';
import Container from '../../../layout/Container';

const fadeLeft = {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 },
};

const fadeRight = {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 },
};

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
};

const HomeStepsGrid = ({ steps }) => {
    return (
        <Section>
            <Container>
                <div className="space-y-20">

                    {steps.map((step, index) => {
                        const isEven = index % 2 === 0;

                        return (
                            <Motion.div
                                key={step.title}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                                className="grid md:grid-cols-2 gap-10 items-center my-10"
                            >

                                {/* LEFT SIDE */}
                                {isEven ? (
                                    <Motion.div variants={fadeLeft} className="space-y-6">
                                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#eff6ff] text-[var(--qb-primary)] font-semibold text-xl shadow-sm">
                                            0{index + 1}
                                        </div>

                                        <h3 className="text-3xl md:text-4xl font-semibold tracking-tight theme-text-primary">
                                            {step.title}
                                        </h3>

                                        <p className="theme-text-secondary text-lg leading-relaxed opacity-80">
                                            {step.description}
                                        </p>
                                    </Motion.div>
                                ) : (
                                    <Motion.div variants={fadeLeft}>
                                        <div className="h-72 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center transition-all hover:border-indigo-500/30 group">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.4em] theme-text-muted opacity-40 group-hover:opacity-60 transition-opacity">
                                                Live Product Preview
                                            </span>
                                        </div>
                                    </Motion.div>
                                )}

                                {/* RIGHT SIDE */}
                                {!isEven ? (
                                    <Motion.div variants={fadeRight} className="space-y-6">
                                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#eff6ff] text-[var(--qb-primary)] font-semibold text-xl shadow-sm">
                                            0{index + 1}
                                        </div>

                                        <h3 className="text-3xl md:text-4xl font-semibold tracking-tight theme-text-primary">
                                            {step.title}
                                        </h3>

                                        <p className="theme-text-secondary text-lg leading-relaxed opacity-80 font-medium">
                                            {step.description}
                                        </p>
                                    </Motion.div>
                                ) : (
                                    <Motion.div variants={fadeRight}>
                                        <div className="h-72 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-white/10 flex items-center justify-center transition-all hover:border-indigo-500/30 group">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.4em] theme-text-muted opacity-40 group-hover:opacity-60 transition-opacity">
                                                Live Product Preview
                                            </span>
                                        </div>
                                    </Motion.div>
                                )}

                            </Motion.div>
                        );
                    })}

                </div>
            </Container>
        </Section>
    );
};

export default HomeStepsGrid;