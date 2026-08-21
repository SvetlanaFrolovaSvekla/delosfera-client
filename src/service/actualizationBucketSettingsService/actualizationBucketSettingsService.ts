import {apiClient} from "@/service/apiClient.ts";

/** Пороги индикации сроков актуализации ВНД (Normal/Approaching/Critical).
 * "Просрочено" сюда не входит — оно не настраивается, это всегда дата в прошлом. */
export interface ActualizationBucketSettings {
    criticalDays: number;
    approachingDays: number;
}

const BASE = "/vnd/actualization-bucket-settings";

export const actualizationBucketSettingsService = {
    async get(): Promise<ActualizationBucketSettings> {
        const {data} = await apiClient.get<ActualizationBucketSettings>(BASE);
        return data;
    },

    async update(settings: ActualizationBucketSettings): Promise<ActualizationBucketSettings> {
        const {data} = await apiClient.put<ActualizationBucketSettings>(BASE, settings);
        return data;
    },
};
