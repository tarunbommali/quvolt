const razorpay = require('../../config/razorpay');
const HostAccount = require('../../models/HostAccount');
const config = require('../../config/env');
const logger = require('../../utils/logger');

async function createConnectedAccount({ hostUserId, email, phone, name }) {
  let hostAccount = await HostAccount.findOne({ hostUserId });

  if (hostAccount?.linkedAccountId) {
    const error = new Error('Razorpay account already exists for this host');
    error.code = 'ACCOUNT_EXISTS';
    throw error;
  }

  if (config.mockPaymentsEnabled) {
    hostAccount = await HostAccount.findOneAndUpdate(
      { hostUserId },
      {
        $set: {
          linkedAccountId: `mock_acc_${Date.now()}`,
          accountStatus: 'pending',
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return hostAccount;
  }

  const account = await razorpay.accounts.create({
    email: email,
    phone: phone || undefined,
    type: 'route',
    reference_id: String(hostUserId),
    legal_business_name: name || 'Quvolt Host',
    business_type: 'individual',
  });

  hostAccount = await HostAccount.findOneAndUpdate(
    { hostUserId },
    {
      $set: {
        linkedAccountId: account.id,
        accountStatus: 'pending',
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return hostAccount;
}

async function generateOnboardingLink(hostUserId) {
  const hostAccount = await HostAccount.findOne({ hostUserId });

  if (!hostAccount?.linkedAccountId) {
    const error = new Error('Razorpay account not found for this host');
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }

  if (config.mockPaymentsEnabled) {
    return { url: 'http://localhost:5173/studio/billing?kyc=success' };
  }

  let link;
  try {
    link = await razorpay.accountLink.create({
      account: hostAccount.linkedAccountId,
      refresh_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/studio/billing?kyc=refresh`,
      return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/studio/billing?kyc=success`,
      type: 'account_onboarding',
    });
  } catch (sdkError) {
    const axios = require('axios');
    const auth = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64');
    const response = await axios.post('https://api.razorpay.com/beta/account_link', {
      account_id: hostAccount.linkedAccountId,
      refresh_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/studio/billing?kyc=refresh`,
      return_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/studio/billing?kyc=success`,
      type: 'account_onboarding',
    }, {
      headers: { Authorization: `Basic ${auth}` }
    });
    link = response.data;
  }

  return { url: link.short_url || link.url };
}

async function checkKycStatus(hostUserId) {
  let hostAccount = await HostAccount.findOne({ hostUserId });

  if (!hostAccount?.linkedAccountId) {
    const error = new Error('Razorpay account not found');
    error.code = 'ACCOUNT_NOT_FOUND';
    throw error;
  }

  if (config.mockPaymentsEnabled) {
    hostAccount.accountStatus = 'verified';
    hostAccount.payoutEnabled = true;
    await hostAccount.save();
    return hostAccount;
  }

  const account = await razorpay.accounts.fetch(hostAccount.linkedAccountId);
  
  const status = account.kyc_verification_status || account.status || 'pending';
  
  let newStatus = 'pending';
  let payoutEnabled = false;
  
  if (['verified', 'activated', 'active'].includes(status)) {
    newStatus = 'verified';
    payoutEnabled = true;
  } else if (['rejected', 'suspended'].includes(status)) {
    newStatus = 'rejected';
  }

  hostAccount = await HostAccount.findOneAndUpdate(
    { hostUserId },
    {
      $set: {
        accountStatus: newStatus,
        payoutEnabled,
      }
    },
    { new: true }
  );

  return hostAccount;
}

module.exports = {
  createConnectedAccount,
  generateOnboardingLink,
  checkKycStatus,
};
