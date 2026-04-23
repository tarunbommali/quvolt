import { Subscription, plans } from '../../../components/common/home';
import Footer from '../../../components/common/Footer';
import { motion as Motion } from 'framer-motion';

import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { components, cx, layout, typography, buttonStyles } from '../../../styles/index';

const UpgradePlansPage = () => {
    return (
        <div className={components.home.page + " min-h-screen"}>
            <div className={components.home.glowWrap}>
                <div className={cx(components.home.glowOrb)} />
            </div>

            <div className="pt-20 pb-24 relative z-10">
                <div className={layout.page}>
                    <Motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-10"
                    >
                        <Link to="/billing" className={cx(buttonStyles.base, buttonStyles.ghost, buttonStyles.sizeSm, 'gap-1.5 mb-6')}>
                            <ArrowLeft size={14} /> Billing
                        </Link>
                        <div className="space-y-1">
                            <h1 className={typography.display}>Choose Your Plan</h1>
                            <p className={typography.body}>Scale your output and audience engagement with the right tier.</p>
                        </div>
                    </Motion.div>

                    <Motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Subscription plans={plans} />
                    </Motion.div>
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default UpgradePlansPage;
