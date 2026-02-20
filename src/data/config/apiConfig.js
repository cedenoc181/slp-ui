const apiConfig = {
  development: {
    baseUrl: 'https://slp-production-ff09.up.railway.app',
  },
  production: {
    baseUrl: 'https://slp-production-ff09.up.railway.app',
  },
};

const environment = process.env.NODE_ENV || 'development';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || apiConfig[environment].baseUrl;

export default {
  baseUrl: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};