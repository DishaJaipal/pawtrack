import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export function ProtectedRoute({ role, children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (<div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="font-body text-on-surface-variant">Loading...</p>
      </div>);
    }
    if (!user) {
        return <Navigate to="/login" replace/>;
    }
    if (role && user.role !== role) {
        return <Navigate to={user.role === "PET_PARENT" ? "/" : "/provider/dashboard"} replace/>;
    }
    return <>{children}</>;
}
