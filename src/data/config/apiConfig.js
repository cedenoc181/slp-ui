const apiConfig = {
  development: {
    baseUrl: 'http://127.0.0.1:8000',
  },
  production: {
    baseUrl: 'https://api.spa-server.com',
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