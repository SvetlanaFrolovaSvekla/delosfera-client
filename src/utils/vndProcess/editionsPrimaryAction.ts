// Главная кнопка сайдбара редакций: что она делает, зависит от того, есть ли у ВНД уже
// действующая редакция, и, если да, от текущего статуса цикла актуализации.
import type {TFunction} from "i18next";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {RedactionsPrimaryActionVariant} from "@/components/componentsVND/componentsOpenVndPage/componentsEditionsTab/RedactionsSidebar.tsx";

export interface EditionsPrimaryAction {
    variant: RedactionsPrimaryActionVariant;
    disabled: boolean;
    /** Кнопка не нужна вовсе (нет никаких прав на актуализацию) */
    hidden: boolean;
    hint?: string;
    hintTooltip?: string;
    action: () => void;
    /** Ссылка под кнопкой ("Настройки актуализации") */
    secondaryLabel?: string;
    secondaryAction?: () => void;
    secondaryTooltip?: string;
}

interface ResolveParams {
    vnd: VndResponse;
    t: TFunction;
    hasCurrentRedaction: boolean;
    uploadBlocked: boolean;
    lastNumber: number | undefined;
    /** Ответственный за актуализацию или главный редактор - может менять её настройки */
    canEditActualizationSettings: boolean;
    confirmingNoChanges: boolean;
    needsPerform: boolean;
    needsConfirmStartAfterRequest: boolean;
    accessPending: boolean;
    canDirectly: boolean;
    canByRequest: boolean;
    openUpload: () => void;
    openStartApproval: () => void;
    openActualizationSettings: () => void;
    confirmNoChanges: () => void;
    openPerform: () => void;
    openStartActualization: () => void;
    openRequestActualization: () => void;
}

const noop = () => {
};

export function resolveEditionsPrimaryAction(p: ResolveParams): EditionsPrimaryAction {
    const {vnd, t} = p;
    const disabledActualize = (hint?: string) => ({variant: "actualize" as const, disabled: true, hint, action: noop});
    const settingsLink = p.canEditActualizationSettings
        ? {
            secondaryLabel: t("openVndPage.redactionsSidebar.actualizationSettings.title"),
            secondaryAction: p.openActualizationSettings,
        }
        : {};

    let result: Omit<EditionsPrimaryAction, "hidden">;

    if (vnd.status === "arch") {
        // Архивация необратима (см. VndService.CancelAsync и проверки в StartAsync/
        // PublishRedactionWithoutApprovalAsync на бэке) - никаких действий с редакциями. Проверка
        // обязана идти РАНЬШЕ !hasCurrentRedaction: документ мог быть архивирован ещё до первой
        // действующей редакции, и тогда попали бы в ветку "new" ниже.
        result = disabledActualize(t("openVndPage.redactionsSidebar.archivedHint"));
    } else if (vnd.status === "consol") {
        // Согласованная редакция ещё не консолидирована - загружать новую рано. Тоже РАНЬШЕ
        // !hasCurrentRedaction: CurrentRedactionId не проставляется при входе в консолидацию
        // (см. VndApprovalService), и для самой первой редакции hasCurrentRedaction здесь false.
        result = disabledActualize(t("openVndPage.redactionsSidebar.consolidationHint"));
    } else if (!p.hasCurrentRedaction) {
        // Нет предыдущих актуальных редакций - добавление новой редакции напрямую, без актуализации
        result = {
            variant: "new",
            disabled: p.uploadBlocked,
            hint: p.uploadBlocked
                ? t("openVndPage.redactionsSidebar.uploadBlockedHint", {number: p.lastNumber})
                : undefined,
            action: p.openUpload,
        };
    } else if (vnd.status === "onact") {
        if (vnd.actualizationPerformed) {
            if (vnd.actualizationPlannedNoChanges) {
                // Заявлено "без изменений" - новая редакция не нужна.
                result = vnd.actualizationRequiresApproval
                    ? {
                        // Отправляем действующую редакцию на согласование как есть (бэк сам
                        // разрешает это, см. VndApprovalService.StartAsync/isNoChangesReviewRound)
                        variant: "startApprovalNoChanges",
                        disabled: false,
                        hint: t("openVndPage.redactionsSidebar.noChangesApprovalHint"),
                        action: p.openStartApproval,
                        ...settingsLink,
                    }
                    : {
                        // Согласование не требуется - подтверждаем отсутствие изменений напрямую,
                        // документ сразу уходит в консолидацию
                        variant: "confirmNoChanges",
                        disabled: p.confirmingNoChanges,
                        hint: t("openVndPage.redactionsSidebar.noChangesConfirmHint"),
                        action: p.confirmNoChanges,
                    };
            } else {
                // Шаг "Выполнить актуализацию" пройден, заявлены изменения - загружаем
                // актуализированную версию (кнопка сама по себе только открывает загрузку файла).
                // Настройки можно поменять и здесь - например, снова отметить "без изменений".
                result = {
                    variant: "uploadActualized",
                    disabled: p.uploadBlocked,
                    hint: p.uploadBlocked
                        ? t("openVndPage.redactionsSidebar.uploadBlockedHint", {number: p.lastNumber})
                        : t("openVndPage.redactionsSidebar.changesUploadHint"),
                    hintTooltip: p.uploadBlocked
                        ? undefined
                        : t("openVndPage.redactionsSidebar.changesUploadHintTooltip"),
                    action: p.openUpload,
                    ...settingsLink,
                };
            }
        } else if (p.needsPerform) {
            // Шаг "Выполнить актуализацию" ещё не пройден, но я могу его выполнить (ответственный
            // или главный редактор) - загрузка новой редакции до этого заблокирована на бэке.
            result = {variant: "performActualization", disabled: false, action: p.openPerform};
        } else {
            // Шаг ещё не пройден, но выполнить его должен кто-то другой (не я)
            result = {
                variant: "performActualization",
                disabled: true,
                hint: t("openVndPage.redactionsSidebar.waitingPerformHint"),
                action: noop,
            };
        }
    } else if (vnd.status === "active") {
        if (p.accessPending) {
            result = disabledActualize(t("openVndPage.redactionsSidebar.pendingRequestHint"));
        } else if (p.needsConfirmStartAfterRequest) {
            // Заявка одобрена - цикл стартует автоматически (см. useEditionsActualization).
            // Пока запрос не отработал - кнопка неактивна.
            result = {
                variant: "performActualization",
                disabled: true,
                hint: t("openVndPage.redactionsSidebar.autoStartingActualizationHint"),
                action: noop,
            };
        } else if (!p.canDirectly && !p.canByRequest) {
            // Нет никаких прав на актуализацию - кнопку прячем целиком (см. hidden ниже)
            result = disabledActualize();
        } else {
            result = {
                variant: "actualize",
                disabled: false,
                action: p.canDirectly ? p.openStartActualization : p.openRequestActualization,
            };
        }
    } else {
        // Согласование/черновик - актуализацию сейчас не начать
        result = disabledActualize();
    }

    return {
        ...result,
        // Неактивная "Взять в актуализацию" без каких-либо прав на актуализацию ничего не даёт
        // пользователю - прячем её целиком (вместе с подсказкой про архив/консолидацию).
        hidden: result.variant === "actualize" && result.disabled && !p.canDirectly && !p.canByRequest,
    };
}
