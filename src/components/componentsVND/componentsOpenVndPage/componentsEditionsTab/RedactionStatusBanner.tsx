// Компонента с header панели для скачивания ВНД
import type {RedactionDisplayStatus} from "@/utils/redactionStatus.ts";
import {Loader2} from "lucide-react";

interface BannerConfig {
    border: string;
    bg: string;
    textColor: string;
    align?: "between" | "center";
}

const BANNER_STYLES: Partial<Record<RedactionDisplayStatus, BannerConfig>> = {
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
    onSubmit?: () => void;
    isSubmitting?: boolean;
}

export function RedactionStatusBanner({
                                          status,
                                          currentNumber,
                                          onSubmit,
                                          isSubmitting,
                                      }: RedactionStatusBannerProps) {
    const config = BANNER_STYLES[status];
    if (!config) return null;

    const message = getBannerMessage(status, currentNumber);
    const isCentered = config.align === "center";
    const isBetween = config.align === "between";

    return (
        <div
            className={`flex flex-wrap items-center gap-3 border-b px-5 py-[11px] ${config.border} ${config.bg} ${
                isBetween ? "justify-between" : isCentered ? "justify-center text-center" : "gap-[10px]"
            }`}
        >
            <span className={`text-[12px] ${config.textColor}`}>{message}</span>

            {status === "draft" && onSubmit && (
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
        </div>
    );
}

function getBannerMessage(status: RedactionDisplayStatus, currentNumber?: number): string {
    switch (status) {
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