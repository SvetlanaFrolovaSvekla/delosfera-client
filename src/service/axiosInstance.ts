import axios from "axios";
import { authService } from "@/service/authService/authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
});

// ------ Перехватчик запросов - срабатывает перед КАЖДЫМ запросом
// Берёт токен из localStorage и добавляет в заголовок
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) config.headers.Authorization = `Bearer ${token}`;

        const lang = localStorage.getItem("i18nextLng") ?? "ru";
        config.headers["Accept-Language"] = lang;

        console.log("Accept-Language отправляем:", lang);
        console.log("i18nextLng в localStorage:", localStorage.getItem("i18nextLng"));

        return config;
    },
    (error) => Promise.reject(error)
);

// Флаг - идёт ли сейчас обновление токена
// Нужен чтобы не отправить, например, 10 запросов на refresh одновременно
let isRefreshing = false;
// Очередь запросов которые получили 401 пока шёл refresh
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

// Функция разбирает очередь - если refresh прошёл успешно, то отдаёт всем запросам новый токен.
// Если нет, то оповещает об ошибке
const processQueue = (error: unknown, token: string | null) => {
    failedQueue.forEach((p) => error ? p.reject(error) : p.resolve(token!));
    failedQueue = [];
};

// ------ Перехватчик ответов - срабатывает когда бэкенд вернул ошибку
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config; // Сохраняется оригинальный запрос, потом повторится с новым токеном


        /*Если ошибка не 401, то не трогаем, пробрасываем дальше
        Если _retry = true - значит уже пробовали повторить,
        второй раз не пытаемся (защита от бесконечного цикла).*/
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Если refresh уже идёт - ставим этот запрос в очередь ждать
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return axiosInstance(originalRequest);
            });
        }

        originalRequest._retry = true; // Помечаем запрос, что уже пробовали повторить
        isRefreshing = true; //  Refresh начался

        /*Отправляем POST /user/refresh с refreshToken.
        Бэкенд возвращает новые токены, сохраняем их в localStorage,
        возвращаем новый accessToken.*/
        try {
            const newToken = await authService.refresh();
            processQueue(null, newToken); // Разбор очереди
            originalRequest.headers.Authorization = `Bearer ${newToken}`; // Обновляем заголовок с новым токеном
            return axiosInstance(originalRequest); // Повторная отправка запросов
        } catch (err) {
            processQueue(err, null);
            await authService.logout();
            window.dispatchEvent(new Event("auth-change")); // Сброс пользователя, редирект на логин
            return Promise.reject(err);
        } finally {
            isRefreshing = false;
        }
    }
);