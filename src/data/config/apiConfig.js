const apiConfig = {
  development: {
    baseUrl: 'https://www.sandlotpicksanalytics.com',
  },
  production: {
    baseUrl: 'https://www.sandlotpicksanalytics.com',
  },
};

const environment = process.env.NODE_ENV || 'development';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || apiConfig[environment].baseUrl;

export default {
  baseUrl: API_BASE_URL,
  timeout: 60000, // 60 seconds for cold starts
  headers: {
    'Content-Type': 'application/json',
  },
};