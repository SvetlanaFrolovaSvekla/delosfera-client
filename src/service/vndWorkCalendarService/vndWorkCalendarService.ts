import {apiClient} from "@/service/apiClient.ts";

/** Праздничный (нерабочий) день производственного календаря ВНД — в срок согласования не входит. */
export interface WorkCalendarDay {
    id: number;
    /** "yyyy-MM-dd" — календарная дата по Бишкеку */
    date: string;
    title: string;
}

export interface SaveWorkCalendarDay {
    date: string;
    title: string;
}

/** Рабочее время банка: минуты от полуночи по Бишкеку (09:00 = 540). */
export interface WorkHours {
    workStartMinutes: number;
    workEndMinutes: number;
}

/** Правила рабочего времени и исключения на период — клиент по ним сам считает оставшееся
 * рабочее время и предпросмотр сроков (без запроса на каждый тик). */
export interface WorkCalendarRules {
    timeZone: string;
    utcOffsetMinutes: number;
    workStartMinutes: number;
    workEndMinutes: number;
    /** Длина рабочего дня — «1 д.» в нормативах согласования. */
    workDayMinutes: number;
    from: string;
    to: string;
    /** Праздники "yyyy-MM-dd". */
    holidays: string[];
}

const BASE = "/vnd/work-calendar";

export const vndWorkCalendarService = {
    async getYear(year: number): Promise<WorkCalendarDay[]> {
        const {data} = await apiClient.get<WorkCalendarDay[]>(BASE, {params: {year}});
        return data;
    },

    async getRules(from: string, to: string): Promise<WorkCalendarRules> {
        const {data} = await apiClient.get<WorkCalendarRules>(`${BASE}/rules`, {params: {from, to}});
        return data;
    },

    async create(day: SaveWorkCalendarDay): Promise<WorkCalendarDay> {
        const {data} = await apiClient.post<WorkCalendarDay>(BASE, day);
        return data;
    },

    async update(id: number, day: SaveWorkCalendarDay): Promise<WorkCalendarDay> {
        const {data} = await apiClient.put<WorkCalendarDay>(`${BASE}/${id}`, day);
        return data;
    },

    async remove(id: number): Promise<void> {
        await apiClient.delete(`${BASE}/${id}`);
    },

    async getHours(): Promise<WorkHours> {
        const {data} = await apiClient.get<WorkHours>(`${BASE}/hours`);
        return data;
    },

    async updateHours(hours: WorkHours): Promise<WorkHours> {
        const {data} = await apiClient.put<WorkHours>(`${BASE}/hours`, hours);
        return data;
    },

    async copyYear(fromYear: number, toYear: number): Promise<{ added: number; skipped: number }> {
        const {data} = await apiClient.post<{ added: number; skipped: number }>(`${BASE}/copy-year`, {fromYear, toYear});
        return data;
    },
};
