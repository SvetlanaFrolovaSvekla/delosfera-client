import {apiClient} from "@/service/apiClient.ts";

/**
 * Кто в маршруте кадровых СЗ выступает кадровиком УЧР — по области автора (КСЗ-04..06).
 * Разделение «Головной офис / филиальная сеть»: автор из филиала → УЧР по филиалам,
 * иначе → УЧР по ГО. Ведёт УЧР без разработчика (КСЗ-12).
 */
export interface HrRoutingSettings {
    headOfficeHrUserId: number | null;
    branchHrUserId: number | null;
}

const BASE = "/sz/hr-routing";

export const hrRoutingService = {
    async get(): Promise<HrRoutingSettings> {
        const {data} = await apiClient.get<HrRoutingSettings>(BASE);
        return data;
    },

    async set(settings: HrRoutingSettings): Promise<HrRoutingSettings> {
        const {data} = await apiClient.put<HrRoutingSettings>(BASE, settings);
        return data;
    },
};
