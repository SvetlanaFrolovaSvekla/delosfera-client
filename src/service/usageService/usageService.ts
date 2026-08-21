import {apiClient} from "@/service/apiClient.ts";
import {getAccessToken} from "@/service/tokenStore.ts";

/**
 * Учёт посещаемости экранов.
 *
 * Переходы копятся в браузере и уходят пачкой. Обращение на каждый клик по меню
 * стоило бы дороже, чем всё, что мы выиграли, ускоряя загрузку страниц: пятьсот
 * человек, кликающих по разделам, — это поток запросов, ничего не добавляющих к
 * работе, но мешающих ей.
 */

export interface VisitRecord {
    path: string;
    title?: string;
    at: string;
    durationMs?: number;
}

export interface UsageOverview {
    days: number;
    from: string;
    to: string;
    totalVisits: number;
    distinctUsers: number;
    distinctScreens: number;
    enabledUsers: number;
    medianDurationMs: number | null;
}

export interface UsagePageRow {
    routePath: string;
    title: string | null;
    visits: number;
    users: number;
    averageDurationMs: number | null;
    lastAt: string;
}

export interface UsageUserRow {
    userId: number;
    fullName: string;
    position: string | null;
    orgUnit: string | null;
    visits: number;
    screens: number;
    days: number;
    firstAt: string;
    lastAt: string;
}

export interface SilentUserRow {
    id: number;
    fullName: string;
    position: string | null;
    orgUnit: string | null;
    lastLoginAt: string | null;
}

export interface UsageTimeline {
    byDay: { day: string; visits: number; users: number }[];
    byHour: { hour: number; visits: number }[];
}

export interface UsageTrailRow {
    routePath: string;
    entityId: number | null;
    title: string | null;
    visitedAt: string;
    durationMs: number | null;
}

const BASE = "/usage";

export const usageService = {
    /**
     * Отправляет накопленные переходы.
     *
     * При закрытии вкладки — через fetch с keepalive, а не sendBeacon: маячок не
     * умеет ставить заголовок с токеном, а токен у нас живёт в памяти вкладки и
     * в cookie не попадает. Маячок ушёл бы без авторизации и был бы отвергнут —
     * то есть последний экран сессии терялся бы молча, а он-то и интересен, если
     * человек ушёл в раздражении.
     */
    async track(sessionKey: string, visits: VisitRecord[], closing = false) {
        if (visits.length === 0) return;

        const payload = JSON.stringify({sessionKey, visits});

        if (closing) {
            const token = getAccessToken();
            const base = import.meta.env.VITE_API_BASE_URL ?? "";

            await fetch(`${base}/api${BASE}/visits`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? {Authorization: `Bearer ${token}`} : {}),
                },
                body: payload,
                credentials: "include",
                keepalive: true,
            });
            return;
        }

        await apiClient.post(`${BASE}/visits`, JSON.parse(payload));
    },

    async overview(days = 14) {
        const {data} = await apiClient.get<UsageOverview>(`${BASE}/overview`, {params: {days}});
        return data;
    },

    async pages(days = 14) {
        const {data} = await apiClient.get<UsagePageRow[]>(`${BASE}/pages`, {params: {days}});
        return data;
    },

    async users(days = 14) {
        const {data} = await apiClient.get<UsageUserRow[]>(`${BASE}/users`, {params: {days}});
        return data;
    },

    async silent(days = 14) {
        const {data} = await apiClient.get<SilentUserRow[]>(`${BASE}/silent`, {params: {days}});
        return data;
    },

    async timeline(days = 14) {
        const {data} = await apiClient.get<UsageTimeline>(`${BASE}/timeline`, {params: {days}});
        return data;
    },

    async trail(userId: number, take = 200) {
        const {data} = await apiClient.get<UsageTrailRow[]>(`${BASE}/users/${userId}`, {params: {take}});
        return data;
    },
};
