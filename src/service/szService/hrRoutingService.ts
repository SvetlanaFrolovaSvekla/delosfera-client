import {apiClient} from "@/service/apiClient.ts";

/**
 * Кто в маршруте кадровых СЗ выступает кадровиком УЧР — по области автора (КСЗ-04..06).
 * Разделение «Головной офис / филиальная сеть»: автор из филиала → УЧР по филиалам,
 * иначе → УЧР по ГО. Ведёт УЧР без разработчика (КСЗ-12).
 */
export interface HrRoutingSettings {
    headOfficeHrUserId: number | null;
    branchHrUserId: number | null;
    /** Согласующий от Операционного управления в маршруте заявок на замещение (ЗМ-Настр). */
    operationsApproverUserId: number | null;
    /** Замена согласующего Операционного управления, если основной заблокирован/отключён. */
    operationsFallbackUserId: number | null;
    /** Подписант от Банка приказа и договора по заявкам на замещение сотрудников Головного офиса
     * (у филиала подписывает директор филиала). Пусто — место подписи директора остаётся незаполненным. */
    headOfficeSignerUserId?: number | null;
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
