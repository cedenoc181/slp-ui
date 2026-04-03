const IS_DEV = process.env.NODE_ENV === 'development';

const REMOTE_URL = 'https://www.sandlotpicksanalytics.com';

// In dev, point at your local backend. Override via .env.local:
//   REACT_APP_LOCAL_API_URL=http://localhost:8000
const LOCAL_URL = IS_DEV
  ? (process.env.REACT_APP_LOCAL_API_URL || 'http://localhost:8000')
  : null;

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || REMOTE_URL;

export { IS_DEV, LOCAL_URL, REMOTE_URL };

const apiConfig = {
  baseUrl: API_BASE_URL,
  localUrl: LOCAL_URL,
  timeout: 60000, // 60 seconds for cold starts
  headers: {
    'Content-Type': 'application/json',
  },
};

export default apiConfig;
