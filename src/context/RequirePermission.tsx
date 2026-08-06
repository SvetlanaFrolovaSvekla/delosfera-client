// Проверка конкретного права доступа роли (permission)
import {Navigate, Outlet} from "react-router-dom";
import {useAuth} from "@/context/AuthContext.ts";
import {Loader} from "@/components/componentsGeneral/Loader";

interface RequirePermissionProps {
    code: number;
}

export function RequirePermission({code}: RequirePermissionProps) {
    const {hasPermission, loading} = useAuth();

    if (loading) return <Loader label="Загрузка…" fullHeight={false}/>;

    return hasPermission(code) ? <Outlet/> : <Navigate to="/" replace/>;
}