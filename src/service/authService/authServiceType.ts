import type {UserResponse} from "@/service/userService/userServiceType.ts";

export interface LoginRequest {
    email: string;
    password: string;
}

// Refresh-токен приходит/уходит через httpOnly-cookie и в JS недоступен —
// в теле ответа его больше нет.
export interface LoginResponse {
    token: string;
    user: UserResponse;
}
