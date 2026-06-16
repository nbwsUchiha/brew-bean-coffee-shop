import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { userId, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="loading-note">Loading…</p>;
  if (!userId) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading, userId } = useAuth();
  const location = useLocation();

  if (loading) return <p className="loading-note">Loading…</p>;
  if (!userId) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (profile?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}
