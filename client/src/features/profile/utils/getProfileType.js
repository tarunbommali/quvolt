// features/profile/utils/getProfileType.js

export const getProfileType = (user) => {
  if (!user) return 'FREE';
  const plan = user.subscription?.plan || user.plan || 'FREE';
  if (plan === 'TEAMS') return 'TEAMS';
  if (plan === 'CREATOR') return 'CREATOR';
  return 'FREE';
};
