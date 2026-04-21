import { useEffect, useState } from 'react';
import {
  getSubscriptionPlans,
  getHostPayoutSummary,
  getMyHostAccount,
  getPaymentHealth,
} from '../../../services/billing.service';

export const useBillingData = () => {
  const [plans, setPlans] = useState([]);
  const [payouts, setPayouts] = useState(null);
  const [hostAccount, setHostAccount] = useState(null);
  const [paymentHealth, setPaymentHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [plansRes, payoutsRes, accountRes, healthRes] = await Promise.all([
          getSubscriptionPlans(),
          getHostPayoutSummary(),
          getMyHostAccount(),
          getPaymentHealth().catch(() => ({ status: 'unknown' })),
        ]);

        setPlans(plansRes);
        setPayouts(payoutsRes);
        setHostAccount(accountRes);
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

  return { plans, payouts, hostAccount, paymentHealth, loading, error };
};

