import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 *
 * Gates a route based on the three backend auth tiers:
 *
 *   <ProtectedRoute>                  — requires any authenticated user
 *   <ProtectedRoute require="verified"> — requires is_verified (get_current_active_verified_user)
 *   <ProtectedRoute require="admin">  — requires is_admin    (get_current_admin_user)
 *
 * Unauthenticated users are redirected to /account.
 * Authenticated users without sufficient privilege are redirected to /account/settings.
 */
function ProtectedRoute({ children, require: require_ = 'user' }) {
  const { isAuthenticated, isVerified, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

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
