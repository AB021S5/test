require('dotenv').config();

const testData = {
  baseUrl: process.env.BASE_URL || 'https://aib-sc-uat.apps.ocp-aronprd.intra.absa.co.za/air',
  username: process.env.LOGIN_USERNAME || 'SCUAT1',
  password: process.env.LOGIN_PASSWORD || 'password',
  otp: process.env.LOGIN_OTP || '123456',
  
  ownFundTransfer: {
    localToLocal: {
      fromAccountType: process.env.OFT_LOCAL_FROM_ACCOUNT_TYPE || 'local',
      toAccountType: process.env.OFT_LOCAL_TO_ACCOUNT_TYPE || 'local',
      amount: process.env.OFT_LOCAL_AMOUNT || '5',
      description: process.env.OFT_LOCAL_DESCRIPTION || 'Local to local transfer',
    },
    eurToUsd: {
      fromAccountType: process.env.OFT_EUR_FROM_ACCOUNT_TYPE || 'eur',
      toAccountType: process.env.OFT_EUR_TO_ACCOUNT_TYPE || 'usd',
      amount: process.env.OFT_EUR_AMOUNT || '1',
      description: process.env.OFT_EUR_DESCRIPTION || 'EUR to USD transfer',
    },
  },
  headless: (process.env.HEADLESS || 'false').toLowerCase() === 'true',
};

module.exports = { testData };
