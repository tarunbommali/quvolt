import {
  HomeHero,
  HomeTrustGrid,
  HomeFeatureGrid,
  HomeStepsGrid,
  Subscription,
  HomeCtaBanner,
  features,
  trustPoints,
  steps,
  plans,
  FAQ
} from '../../../components/common/home';
import { useAuthStore } from '../../../stores/useAuthStore';

import Footer from '../../../components/common/Footer';
import { components, cx } from '../../../styles/index';

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
      <Subscription plans={plans} />
      <HomeCtaBanner user={user} />

      <FAQ />
      <Footer />
    </div>
  );
};

export default PublicLandingPage;
