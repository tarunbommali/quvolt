import {
  HomeHero,
  HomeTrustGrid,
  HomeFeatureGrid,
  HomeStepsGrid,
  HomePricingGrid,
  HomeCtaBanner,
  features,
  trustPoints,
  steps,
  plans,
} from '../../../components/common/home';
import { useAuthStore } from '../../../stores/useAuthStore';
import { components } from '../../../styles/components';
import { cx } from '../../../styles/theme';
import Footer from '../../../components/common/Footer';

const PublicLandingPage = () => {
  const user = useAuthStore((s) => s.user);

  return (
    <div className={components.home.page}>
      <div className={components.home.glowWrap}>
        <div className={cx(components.home.glowOrb)} />
      </div>

      <HomeHero user={user} />
      <HomeTrustGrid trustPoints={trustPoints} />
      <HomeFeatureGrid features={features} />
      <HomeStepsGrid steps={steps} />
      <HomePricingGrid plans={plans} />
      <HomeCtaBanner user={user} />
      <Footer />
    </div>
  );
};

export default PublicLandingPage;
