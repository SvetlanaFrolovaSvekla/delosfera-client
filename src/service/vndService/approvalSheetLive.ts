// Лист согласования по ТЕКУЩЕМУ состоянию процесса (VndApprovalSheetController на бэке) - формируется
// при каждом запросе, поэтому после каждой резолюции уже актуален. Два режима:
//   plain  - решения и даты, колонка "Подпись" пустая;
//   signed - в колонке "Подпись" штамп "Подписано с помощью ЭЦП" (владелец, сертификат, хэш подписи).
// Пути подобраны под fetchFileBlob/useDocxPreview: /api/{endpoint}/{processId}{pathSuffix}.
import i18n from "i18next";
import {fetchFileBlob, saveBlob} from "@/utils/downloadFiles/downloadFile.ts";
import {toast} from "@/service/toastService.ts";

export type ApprovalSheetMode = "plain" | "signed";

export const approvalSheetEndpoint = (vndId: number) => `vnd/${vndId}/approval-sheet`;
export const approvalSheetPathSuffix = (mode: ApprovalSheetMode) => `?mode=${mode}`;

export async function downloadApprovalSheet(
    vndId: number, processId: number, mode: ApprovalSheetMode, fallbackName: string,
): Promise<void> {
    const toastId = toast.loading(i18n.t("approvalSheetLive.downloading"), fallbackName);
    try {
        const {blob, fileName} = await fetchFileBlob(
            processId, fallbackName, undefined, approvalSheetEndpoint(vndId), approvalSheetPathSuffix(mode));
        saveBlob(blob, fileName);
        toast.update(toastId, {
            variant: "success", title: i18n.t("approvalSheetLive.downloaded"), description: fileName, duration: 4500,
        });
    } catch (e) {
        toast.update(toastId, {
            variant: "error",
            title: i18n.t("approvalSheetLive.downloadError"),
            description: e instanceof Error ? e.message : "",
            duration: 5500,
        });
    }
}
