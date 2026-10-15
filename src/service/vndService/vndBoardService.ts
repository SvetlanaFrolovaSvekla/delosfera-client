// "Доска ВНД" — личная витрина документов пользователя (см. VndBoardPage).
// Состав доски считает сервер: ВНД, где СП пользователя — разработчик или ответственный
// исполнитель, плюс добавленные вручную, минус убранные пользователем (см. VndBoardService на бэке).
import type {VndResponse} from "./vndServiceType.ts";
import {getAccessToken} from "@/service/tokenStore.ts";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

/** Почему документ оказался на доске */
export type VndBoardReason = "developer" | "executor" | "pinned";

export interface VndBoardUnit {
    id: number;
    name: string;
}

export interface VndBoardEntry {
    vnd: VndResponse;
    reasons: VndBoardReason[];
    /** Когда документ добавлен вручную (только для reason "pinned") */
    pinnedAt: string | null;
}

export interface VndBoardResponse {
    /** Подразделение пользователя из его карточки; null — не привязан к подразделению */
    ownUnit: VndBoardUnit | null;
    /** СП, по которому подбираются документы: ближайшее управление над подразделением пользователя */
    scopeUnit: VndBoardUnit | null;
    /** Сколько подразделений (вместе с вложенными) входит в scopeUnit */
    scopeUnitCount: number;
    items: VndBoardEntry[];
    /** Связанные с СП документы, убранные пользователем с доски */
    hidden: VndResponse[];
    /** Личное "Избранное" пользователя */
    favorites: VndResponse[];
}

function authHeaders(): HeadersInit {
    const token = getAccessToken();
    return token ? {Authorization: `Bearer ${token}`} : {};
}

async function ensureOk(response: Response): Promise<void> {
    if (response.ok) return;
    const errorBody = await response.json().catch(() => null);
    throw new Error(errorBody?.message ?? `Ошибка запроса: ${response.status}`);
}

export const vndBoardService = {
    async get(): Promise<VndBoardResponse> {
        const response = await fetch(`${API_BASE}/vnd/board`, {headers: authHeaders()});
        await ensureOk(response);
        return await response.json() as VndBoardResponse;
    },

    /** Поставить документ на доску: закрепить вручную или вернуть убранный (идемпотентно) */
    async add(vndId: number): Promise<void> {
        const response = await fetch(`${API_BASE}/vnd/board/${vndId}`, {method: "PUT", headers: authHeaders()});
        await ensureOk(response);
    },

    /** Убрать документ с доски: открепить добавленный вручную или скрыть связанный с СП */
    async remove(vndId: number): Promise<void> {
        const response = await fetch(`${API_BASE}/vnd/board/${vndId}`, {method: "DELETE", headers: authHeaders()});
        await ensureOk(response);
    },
};
