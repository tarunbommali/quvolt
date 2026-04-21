import { motion as Motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
            ease: [0.25, 0.8, 0.25, 1],
        },
    },
};
const FeatureCard = ({ icon: Icon, title, description }) => (
    <Motion.div
        variants={fadeUp}
        whileHover={{ y: -12 }}
        className="group relative p-8 rounded-3xl 
        bg-gradient-to-b from-white/[0.06] to-transparent 
        border border-white/10 
        hover:border-indigo-500/40 
        transition-all duration-500 
        hover:shadow-[0_20px_60px_rgba(99,102,241,0.2)] 
        overflow-hidden"
    >

        {/* 🔥 Glow halo (big improvement) */}
        <div className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition duration-500 blur-xl bg-indigo-500/10" />

        {/* 🔥 Top highlight line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent opacity-0 group-hover:opacity-100 transition" />

        {/* Icon */}
        <div className="relative w-14 h-14 flex items-center justify-center 
            rounded-full bg-indigo-500/10 border border-indigo-400/20 
            text-indigo-400 mb-6 transition-all duration-300 
            group-hover:scale-110 group-hover:bg-indigo-500/20">

            <Icon size={24} />
        </div>

        {/* Title */}
        <h3 className="relative font-semibold text-xl theme-text-primary mb-3">
            {title}
        </h3>

        {/* Description */}
        <p className="relative text-base theme-text-secondary opacity-70 leading-relaxed">
            {description}
        </p>

    </Motion.div>
);

export default FeatureCard;