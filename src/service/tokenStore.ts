/**
 * Хранилище access-токена ТОЛЬКО в памяти вкладки.
 *
 * Токены больше не кладутся в localStorage (уязвимо к XSS). Access-токен живёт в этой
 * переменной и теряется при перезагрузке — сессия восстанавливается вызовом /auth/refresh,
 * который отправляет httpOnly refresh-cookie. Refresh-токен из JS недоступен в принципе.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
    return accessToken;
}

export function setAccessToken(token: string | null): void {
    accessToken = token;
}
