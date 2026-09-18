import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export function PublicOnlyRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return null;
    if (user) {
        return <Navigate to={user.role === "PET_PARENT" ? "/" : "/provider/dashboard"} replace/>;
    }
    return <>{children}</>;
}
