import {apiClient} from "@/service/apiClient.ts";

/** Разрез сводки: сколько записок в каждом состоянии. */
export interface SzStatisticsCell {
    total: number;
    inWork: number;
    overdue: number;
    executed: number;
    other: number;
}

export interface SzStatistics {
    from: string | null;
    to: string | null;

    total: number;
    inWork: number;
    overdue: number;
    executed: number;

    /** Черновики, отозванные и забракованные — в работу не считаются. */
    other: number;

    byUnit: Record<string, SzStatisticsCell>;
    byKind: Record<string, SzStatisticsCell>;
    byMonth: Record<string, SzStatisticsCell>;
}

export interface SzStatisticsFilter {
    from?: string;
    to?: string;
    orgUnitId?: number;
    kindId?: number;
}

const BASE = "/sz/statistics";

/**
 * Имя файла из Content-Disposition. ASP.NET для кириллицы отдаёт два параметра:
 * filename="____ __ ....xlsx" (ASCII-заглушка) и filename*=UTF-8''%D0%90... (настоящее имя).
 * Сначала берём filename*, и только если его нет — обычный filename.
 */
function fileNameFrom(header: string | undefined, fallback: string): string {
    if (!header) return fallback;

    const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)?'[^']*'([^;]+)/i.exec(header)?.[1];
    if (encoded) {
        try {
            return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ""));
        } catch {
            /* битая кодировка — пробуем обычный filename ниже */
        }
    }

    const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)?.[1]?.trim();
    // Подчёркивания подряд — это ASCII-заглушка вместо кириллицы, она пользователю не нужна.
    return plain && !plain.includes("__") ? plain : fallback;
}

export const szStatisticsService = {
    async get(filter: SzStatisticsFilter): Promise<SzStatistics> {
        const {data} = await apiClient.get<SzStatistics>(BASE, {params: filter});
        return data;
    },

    /**
     * Выгрузка книгой Excel. Файл забираем запросом, а не переходом по адресу:
     * токен уходит заголовком, и по прямой ссылке сервер ответил бы отказом.
     */
    async export(filter: SzStatisticsFilter): Promise<void> {
        const response = await apiClient.get(`${BASE}/export`, {params: filter, responseType: "blob"});

        const url = URL.createObjectURL(response.data as Blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileNameFrom(
            (response.headers as Record<string, string>)["content-disposition"],
            "Аналитика служебных записок.xlsx",
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Отзываем ссылку не сразу: иначе часть браузеров не успевает начать скачивание.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
};
