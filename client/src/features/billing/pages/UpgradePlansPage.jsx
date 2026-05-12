import { Subscription, plans } from '../../../components/common/home';
import Footer from '../../../components/common/Footer';
import { motion as Motion } from 'framer-motion';

import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { components, cx, layout, typography, buttonStyles } from '../../../styles/index';

const UpgradePlansPage = () => {
    return (
        <div className={cx(layout.page, 'min-h-screen')}>
            <div className={components.home.glowWrap}>
                <div className={cx(components.home.glowOrb)} />
            </div>


                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <Subscription plans={plans} />
                </Motion.div>

            <Footer />
        </div>
    );
};

export default UpgradePlansPage;
