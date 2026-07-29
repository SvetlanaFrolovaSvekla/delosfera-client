import type {UserResponse} from "@/service/userService/userServiceType.ts";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface LoginResponse {
    token: string;
    refreshToken: string;
    user: UserResponse;
}