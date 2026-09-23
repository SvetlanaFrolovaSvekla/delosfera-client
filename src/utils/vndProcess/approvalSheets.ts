// Листы согласования редакции - у одной редакции их может быть несколько: первый формируется,
// когда редакция согласуется впервые, и ещё по одному - за каждое повторное согласование в
// рамках актуализации без изменений (см. VndRedactionApprovalSheet на бэке). Общие хелперы для
// всех мест, где листы показываются: "Специальные вложения", вложения редакции, просмотр
// листа, история ВНД.
import type {TFunction} from "i18next";
import type {
    VndRedactionApprovalSheetResponse,
    VndRedactionResponse,
} from "@/service/vndService/vndServiceType.ts";
import {formatDate} from "@/utils/dateUtils.ts";

/** Все листы редакции от первого к последнему. Если сервер ещё не отдаёт список (старый бэк) -
 * собираем "список" из одного последнего листа, как было раньше. */
export function getRedactionApprovalSheets(redaction: VndRedactionResponse): VndRedactionApprovalSheetResponse[] {
    if (redaction.approvalSheets && redaction.approvalSheets.length > 0) return redaction.approvalSheets;
    if (redaction.approvalSheetFileId === null) return [];
    return [{
        id: -1,
        fileId: redaction.approvalSheetFileId,
        fileName: `${redaction.code}_Лист_согласования.docx`,
        sizeBytes: 0,
        approvalProcessId: null,
        isNoChangesActualization: false,
        isManual: false,
        approvedAt: redaction.createdAt,
    }];
}

/** Подпись листа: "Первичное согласование · 12.03.2025", "Актуализация без изменений · 23.09.2026"
 * или "Приложен вручную · ...". */
export function approvalSheetCaption(t: TFunction, sheet: VndRedactionApprovalSheetResponse): string {
    const kind = sheet.isNoChangesActualization
        ? t("approvalSheets.noChanges")
        : sheet.isManual
            ? t("approvalSheets.manual")
            : t("approvalSheets.primary");
    return `${kind} · ${formatDate(sheet.approvedAt)}`;
}
