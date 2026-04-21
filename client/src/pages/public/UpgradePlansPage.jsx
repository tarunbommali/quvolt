import { Subscription, plans } from '../../components/common/home';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { components } from '../../styles/components';
import { cx } from '../../styles/theme';

const UpgradePlansPage = () => {
    return (
        <div className={components.home.page}>
            <div className={components.home.glowWrap}>
                <div className={cx(components.home.glowOrb)} />
            </div>
            
            <div className="pt-12 pb-12">
                <Subscription plans={plans} />
            </div>
            
            <Footer />
        </div>
    );
};

export default UpgradePlansPage;
