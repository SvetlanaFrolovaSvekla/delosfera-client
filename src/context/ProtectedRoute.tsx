// Компонент-обёртка для защищённых роутов (редиректит на страницу авторизации)
import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

export function ProtectedRoute() {
    const {user, loading} = useAuth();

    if (loading) return <Loader label="Загрузка…" fullHeight={false}/>;

    if (!user) return <Navigate to="/auth" replace />;

    return <Outlet />;
}