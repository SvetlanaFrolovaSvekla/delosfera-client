import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.ts";

export function ProtectedRoute() {
    const {user, loading} = useAuth();

    if (loading) return null; // TODO: загрузка

    if (!user) return <Navigate to="/auth" replace />;

    return <Outlet />;
}