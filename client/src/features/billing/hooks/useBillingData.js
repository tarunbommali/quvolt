import { useEffect, useState } from 'react';
  getSubscriptionPlans,
  getPaymentHealth,
} from '../../../services/billing.service';

export const useBillingData = () => {
  const [plans, setPlans] = useState([]);
  const [paymentHealth, setPaymentHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [plansRes, healthRes] = await Promise.all([
          getSubscriptionPlans(),
          getPaymentHealth().catch(() => ({ status: 'unknown' })),
        ]);

        setPlans(plansRes);
        setPaymentHealth(healthRes);
      } catch (err) {
        console.error('Failed to fetch billing data:', err);
        setError('Could not load billing information. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { plans, paymentHealth, loading, error };
};

