import {apiClient} from "@/service/apiClient.ts";

/** Нормативы сроков согласования редакции ВНД по умолчанию (в минутах) — справочник
 * "Нормативы согласования по умолчанию" в разделе ВНД. Ими предзаполняется маршрут
 * в модалке запуска согласования. */
export interface VndApprovalNormSettings {
    primaryDeadlineMinutes: number;
    repeatDeadlineMinutes: number;
    finalHoldDeadlineMinutes: number;
}

const BASE = "/vnd/approval-norm-settings";

export const vndApprovalNormSettingsService = {
    async get(): Promise<VndApprovalNormSettings> {
        const {data} = await apiClient.get<VndApprovalNormSettings>(BASE);
        return data;
    },

    async update(settings: VndApprovalNormSettings): Promise<VndApprovalNormSettings> {
        const {data} = await apiClient.put<VndApprovalNormSettings>(BASE, settings);
        return data;
    },
};
