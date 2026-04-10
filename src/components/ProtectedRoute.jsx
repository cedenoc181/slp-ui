import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 *
 * Gates a route based on auth / subscription tier:
 *
 *   <ProtectedRoute>                   — requires any authenticated user
 *   <ProtectedRoute require="premium"> — requires subscription_tier === 'premium' (or admin)
 *   <ProtectedRoute require="verified"> — requires is_verified
 *   <ProtectedRoute require="admin">   — requires is_admin
 *
 * Unauthenticated users are redirected to /account.
 * Non-premium users hitting a premium route are redirected to /predictions.
 * Authenticated users without sufficient privilege are redirected to /account/settings.
 */
function ProtectedRoute({ children, require: require_ = 'user' }) {
  const { isAuthenticated, isVerified, isAdmin, isPremium, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (require_ === 'premium' && (!isAuthenticated || !isPremium)) {
    return <Navigate to="/predictions" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/account" state={{ from: location }} replace />;
  }

  if (require_ === 'verified' && !isVerified) {
    return <Navigate to="/account/settings" state={{ from: location }} replace />;
  }

  if (require_ === 'admin' && !isAdmin) {
    return <Navigate to="/account/settings" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
