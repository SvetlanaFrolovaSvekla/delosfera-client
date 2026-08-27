// Компонента с header панели для скачивания ВНД
import type {RedactionDisplayStatus} from "@/utils/redactionStatus.ts";
import {Loader2} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {formatDate} from "@/utils/dateUtils.ts";

interface BannerConfig {
    border: string;
    bg: string;
    textColor: string;
    align?: "between" | "center";
}

const BANNER_STYLES: Partial<Record<RedactionDisplayStatus, BannerConfig>> = {
    pendingEffective: {
        border: "border-[#f3d0a8]",
        bg: "bg-[#fff7ed]",
        textColor: "text-[#7c2d12]",
        align: "center",
    },
    draft: {
        border: "border-[#e0e2f7]",
        bg: "bg-[#f5f6fd]",
        textColor: "text-[#3a4560]",
        align: "between",
    },
    pending: {
        border: "border-[#f0dcae]",
        bg: "bg-[#fdf6e8]",
        textColor: "text-[#9a6408]",
    },
    rejected: {
        border: "border-[#f2c2c2]",
        bg: "bg-[#fdf1f1]",
        textColor: "text-[#c0392b]",
    },
    consolidation: {
        border: "border-[#ddd0fa]",
        bg: "bg-[#f4f0ff]",
        textColor: "text-[#6b6494]",
        align: "center",
    },
    outdated: {
        border: "border-[#f0dcae]",
        bg: "bg-[#fdf6e0]",
        textColor: "text-[#c0392b]",
        align: "center",
    },
};

interface RedactionStatusBannerProps {
    status: RedactionDisplayStatus;
    redactionNumber?: number;
    currentNumber?: number;
    /** Дата вступления в силу ВНД — нужна только для текста статуса "pendingEffective" */
    effectiveDate?: string | null;
    onSubmit?: () => void;
    isSubmitting?: boolean;
    /** Переход на таб «Ход согласования» — кнопка появляется в статусе "pending" и только
     * для тех, кому есть смысл сразу туда идти: участвующий согласующий, инициатор
     * согласования или инициатор самой ВНД (см. VndEditionsTab). */
    onGoToApproval?: () => void;
    /** Только для главного редактора: сделать черновик действующим напрямую, минуя
     * согласование. Кнопка появляется рядом с "Отправить на согласование" в статусе "draft". */
    onPublishWithoutApproval?: () => void;
    isPublishingWithoutApproval?: boolean;
    /** true — редакция актуализации (Number > 1) без файла ТИД: "Отправить на согласование" и
     * "Сделать актуальной редакцией без согласования" скрываются, вместо них показывается кнопка
     * "Сформировать или загрузить ТИД" (заметка про автоформирование в разработке — уже внутри
     * той модалки, не здесь). */
    tidMissing?: boolean;
    onUploadTid?: () => void;
}

export function RedactionStatusBanner({
                                          status,
                                          currentNumber,
                                          effectiveDate,
                                          onSubmit,
                                          isSubmitting,
                                          onGoToApproval,
                                          onPublishWithoutApproval,
                                          isPublishingWithoutApproval,
                                          tidMissing,
                                          onUploadTid,
                                      }: RedactionStatusBannerProps) {
    const config = BANNER_STYLES[status];
    if (!config) return null;

    const isCentered = config.align === "center";
    const isBetween = config.align === "between";

    const showTidMissing = status === "draft" && tidMissing;
    const message = showTidMissing
        ? "Чтобы перейти к согласованию — необходимо добавить ТИД:"
        : getBannerMessage(status, currentNumber, effectiveDate);

    return (
        <div
            className={`flex flex-wrap items-center gap-3 border-b px-5 py-[11px] ${config.border} ${config.bg} ${
                isBetween ? "justify-between" : isCentered ? "justify-center text-center" : "gap-[10px]"
            }`}
        >
            <span className={`text-[12px] ${config.textColor}`}>{message}</span>

            <div className="ml-auto flex items-center gap-3">
                {status === "draft" && !tidMissing && onSubmit && (
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onSubmit}
                        className="cursor-pointer flex h-[30px] items-center gap-2 rounded-[8px] bg-[#4e57d6] px-3 text-[12px] font-semibold text-white hover:bg-[#3f47bd] disabled:opacity-60"
                    >
                        {isSubmitting && <Loader2 size={13} className="animate-spin"/>}
                        Отправить на согласование
                    </button>
                )}

                {status === "draft" && !tidMissing && onPublishWithoutApproval && (
                    <Tooltip
                        content="Редакция станет действующей сразу, минуя процесс согласования полностью. Это решение фиксируется как выполненное главным редактором."
                        side="top"
                    >
                        <button
                            type="button"
                            disabled={isPublishingWithoutApproval}
                            onClick={onPublishWithoutApproval}
                            className="cursor-pointer flex h-[30px] items-center gap-2 rounded-[8px] border border-[#d7dee8] bg-white px-3 text-[12px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                        >
                            {isPublishingWithoutApproval && <Loader2 size={13} className="animate-spin"/>}
                            Сделать актуальной редакцией без согласования
                        </button>
                    </Tooltip>
                )}

                {showTidMissing && onUploadTid && (
                    <button
                        type="button"
                        onClick={onUploadTid}
                        className="cursor-pointer flex h-[30px] items-center gap-2 rounded-[8px] bg-[#4e57d6] px-3 text-[12px] font-semibold text-white hover:bg-[#3f47bd]"
                    >
                        Сформировать или загрузить ТИД
                    </button>
                )}

                {status === "pending" && onGoToApproval && (
                    <button
                        type="button"
                        onClick={onGoToApproval}
                        className="cursor-pointer flex h-[30px] items-center gap-2 rounded-[8px] bg-[#4e57d6] px-3 text-[12px] font-semibold text-white hover:bg-[#3f47bd]"
                    >
                        Перейти к согласованию (Вы согласующий)
                    </button>
                )}
            </div>
        </div>
    );
}

function getBannerMessage(status: RedactionDisplayStatus, currentNumber?: number, effectiveDate?: string | null): string {
    switch (status) {
        case "pendingEffective":
            return `Дата вступления в силу — ${formatDate(effectiveDate)}, дата, с которой редакция ` +
                "становится действующей; до этого момента документ находится в статусе «Ожидание вступления в силу».";
        case "draft":
            return "Черновик редакции. Пока редакция не отправлена на согласование — она доступна для Ваших правок (сейчас данный черновик видите только Вы и главный редактор ВНД)...";
        case "pending":
            return "Редакция ожидает решения по согласованию (сейчас данная версия редакции доступна для просмотра только редакторам ВНД)...";
        case "rejected":
            return "Эта редакция была отклонена при согласовании и не стала действующей (сейчас данная версия редакции доступна для просмотра только редакторам ВНД)...";
        case "consolidation":
            return "Документ находится на этапе консолидации после актуализации. По завершении этого этапа отображаемая редакция станет действующей (сейчас данная версия редакции доступна для просмотра только редакторам ВНД).";
        case "outdated":
            return `Внимание! Вы просматриваете текст устаревшей редакции документа. Использование текста этой редакции может привести к ошибкам при принятии решений. Действующая редакция — Р${
                currentNumber ?? "—"
            }.`;
        default:
            return "";
    }
}