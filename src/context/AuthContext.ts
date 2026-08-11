import {createContext, useContext} from "react";
import type {UserResponse} from "@/service/userService/userServiceType.ts";

interface AuthContextType {
    user: UserResponse | null;
    loading: boolean;
    permissionCodes: Set<number>;
    hasPermission: (code: number) => boolean;
    login: (email: string, password: string) => Promise<void>;
    /** Вход по доменной (LDAP) учётной записи рабочей станции */
    loginDomain: () => Promise<void>;
    logout: () => Promise<void>;
    refetch: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    permissionCodes: new Set(),
    hasPermission: () => false,
    login: async () => {},
    loginDomain: async () => {},
    logout: async () => {},
    refetch: async () => {},
});

export const useAuth = () => useContext(AuthContext);