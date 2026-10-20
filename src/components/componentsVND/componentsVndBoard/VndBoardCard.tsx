// Карточка документа на "Доске ВНД": код, название, почему документ здесь (чипы причин) и одна
// строка самой полезной для этой панели информации — срок актуализации, ответственный, дата
// архивации и т.п. Действия (звёздочка, "убрать с доски") появляются при наведении.
import {type MouseEvent, type ReactNode, useState} from "react";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import {
    Building2, CalendarClock, Lock, Pin, PinOff, Star, UserRound, X,
} from "lucide-react";

import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {VndBoardReason} from "@/service/vndService/vndBoardService.ts";
import {getVndDisplayMeta, isVndPendingEffective, PENDING_EFFECTIVE_META} from "@/constants/vndStatus.ts";
import {VND_BOARD_REASON_META, VND_BOARD_REASON_ORDER, type VndBoardPanelKey} from "@/constants/vndBoard.ts";
import {ACTUALIZATION_BUCKET_STYLE} from "@/hooks/actualizationHooks/useActualizationBucketMeta.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";

/** Что делает кнопка "убрать" на этой карточке */
export type VndBoardRemoveKind = "hide" | "unpin" | "unfavorite";

interface VndBoardCardProps {
    vnd: VndResponse;
    panelKey: VndBoardPanelKey;
    reasons: VndBoardReason[];
    searchQuery: string;
    canViewExtended: boolean;
    busy: boolean;
    onToggleFavorite: (vnd: VndResponse) => void;
    removeKind: VndBoardRemoveKind | null;
    onRemove?: (vnd: VndResponse, kind: VndBoardRemoveKind) => void;
}

function daysUntil(date: string | null | undefined): number | null {
    if (!date) return null;
    const target = new Date(`${date.slice(0, 10)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function VndBoardCard({
                                 vnd, panelKey, reasons, searchQuery, canViewExtended, busy,
                                 onToggleFavorite, removeKind, onRemove,
                             }: VndBoardCardProps) {
    const {t, i18n} = useTranslation();
    const [confirmHideOpen, setConfirmHideOpen] = useState(false);
    const locale = i18n.language === "en" ? "en-GB" : "ru-RU";
    const formatDate = (value: string | null | undefined) =>
        value ? new Date(value).toLocaleDateString(locale, {day: "2-digit", month: "2-digit", year: "numeric"}) : null;

    const stop = (handler: () => void) => (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) handler();
    };

    // Строка "главного" для этой панели — то, ради чего человек вообще смотрит на колонку
    const meta = renderMeta();

    function renderMeta(): ReactNode {
        if (panelKey === "favorites") {
            const statusMeta = canViewExtended
                ? getVndDisplayMeta(vnd.status, vnd.effectiveDate)
                : null;
            if (!statusMeta) return null;
            const Icon = statusMeta.icon;
            return (
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] text-[11px] font-semibold"
                      style={{color: statusMeta.color, background: statusMeta.bg}}>
                    <Icon className="h-3 w-3" strokeWidth={2.2}/>
                    {t(statusMeta.label)}
                </span>
            );
        }

        if (panelKey === "arch") {
            const date = formatDate(vnd.archivedDate ?? vnd.cancelDate);
            return date ? <MetaLine icon={CalendarClock}>{t("vndBoard.meta.archivedAt", {date})}</MetaLine> : null;
        }

        if (panelKey === "draft") {
            return vnd.createdByUserName
                ? <MetaLine icon={UserRound}>{t("vndBoard.meta.createdBy", {name: vnd.createdByUserName})}</MetaLine>
                : null;
        }

        if (panelKey === "review") {
            const date = formatDate(vnd.revisionChangedDate ?? vnd.updatedAt);
            return date ? <MetaLine icon={CalendarClock}>{t("vndBoard.meta.revisionFrom", {date})}</MetaLine> : null;
        }

        if ((panelKey === "onact" || panelKey === "consol") && vnd.actualizationResponsibleUserName) {
            return (
                <MetaLine icon={UserRound}>
                    {t("vndBoard.meta.responsible", {name: vnd.actualizationResponsibleUserName})}
                </MetaLine>
            );
        }

        if (panelKey === "active" && isVndPendingEffective(vnd.status, vnd.effectiveDate)) {
            return (
                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-[2px] text-[11px] font-semibold"
                      style={{color: PENDING_EFFECTIVE_META.color, background: PENDING_EFFECTIVE_META.bg}}>
                    <CalendarClock className="h-3 w-3" strokeWidth={2.2}/>
                    {t("vndBoard.meta.effectiveFrom", {date: formatDate(vnd.effectiveDate)})}
                </span>
            );
        }

        // Срок плановой актуализации — для действующих (и как запасной вариант для onact/consol)
        const days = daysUntil(vnd.dueActualizationDate);
        if (days === null) return null;
        const style = vnd.actualizationBucket ? ACTUALIZATION_BUCKET_STYLE[vnd.actualizationBucket] : null;
        return (
            <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium"
                  style={{color: style?.color ?? "#8b97ab"}}>
                <span className="h-1.5 w-1.5 rounded-full" style={{background: style?.color ?? "#a3adbd"}}/>
                {days >= 0
                    ? t("vndBoard.meta.actualizationIn", {count: days})
                    : t("vndBoard.meta.actualizationOverdue", {count: -days})}
            </span>
        );
    }

    const removeTooltip = removeKind ? t(`vndBoard.actions.${removeKind}`) : "";
    const RemoveIcon = removeKind === "hide" ? PinOff : removeKind === "unpin" ? Pin : X;
    return (
        <>
            <article
                className="group relative rounded-xl border border-[#e9edf3] bg-white px-3.5 pb-3 pt-3 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[#d5dcf0] hover:shadow-[0_8px_20px_-12px_rgba(31,45,90,0.35)] focus-within:border-[#cbd3f5]"
            >
                <div className="flex items-start justify-between gap-2">
                <span
                    className="inline-flex min-w-0 items-center gap-1 font-mono text-[11.5px] font-semibold text-[#4e57d6]">
                    <span className="truncate"><HighlightText text={vnd.code} query={searchQuery}/></span>
                    {vnd.isSecret && (
                        <Tooltip className="relative z-10"
                                 content={t(vnd.secretAccessDenied ? "vndTable.secretDenied" : "vndTable.secretAllowed")}>
                            <Lock className="h-3 w-3 flex-none" strokeWidth={2.4}
                                  color={vnd.secretAccessDenied ? "#c0392b" : "#8b97ab"}/>
                        </Tooltip>
                    )}
                </span>

                    {/* Действия: звёздочка видна всегда, если документ в избранном, остальное — по наведению */}
                    <span className="relative z-10 -mr-1 -mt-1 flex flex-none items-center gap-0.5">
                    <Tooltip content={vnd.isFavorite ? t("favorites.removeTooltip") : t("favorites.add")}>
                        <button
                            type="button"
                            aria-label={vnd.isFavorite ? t("favorites.removeTooltip") : t("favorites.add")}
                            aria-pressed={vnd.isFavorite}
                            onClick={stop(() => onToggleFavorite(vnd))}
                            className={`grid h-7 w-7 place-items-center rounded-lg border-none bg-transparent cursor-pointer hover:bg-[#fff6dc] ${
                                vnd.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                            }`}
                        >
                            <Star className="h-[15px] w-[15px]" strokeWidth={2}
                                  fill={vnd.isFavorite ? "#f5b400" : "none"}
                                  color={vnd.isFavorite ? "#e0a100" : "#a3adbd"}/>
                        </button>
                    </Tooltip>
                        {removeKind && onRemove && (
                            <Tooltip content={removeTooltip}>
                                <button
                                    type="button"
                                    aria-label={removeTooltip}
                                    onClick={stop(() => {
                                        if (removeKind === "hide") setConfirmHideOpen(true);
                                        else onRemove(vnd, removeKind);
                                    })}
                                    className="grid h-7 w-7 place-items-center rounded-lg border-none bg-transparent text-[#a3adbd] opacity-0 cursor-pointer hover:bg-[#f2f5f9] hover:text-[#55617a] group-hover:opacity-100 focus-visible:opacity-100"
                                >
                                    <RemoveIcon className="h-[15px] w-[15px]" strokeWidth={2}/>
                                </button>
                            </Tooltip>
                        )}
                </span>
                </div>

                <Link
                    to={`/base-vnd/${vnd.id}`}
                    className="mt-1 block text-[13px] font-medium leading-[1.4] text-[#1c2740] no-underline outline-none before:absolute before:inset-0 before:rounded-xl before:content-[''] focus-visible:before:outline-2 focus-visible:before:outline-[#4e57d6] group-hover:text-[#0f1b2d]"
                >
                <span className="line-clamp-3 text-[#1c2740] group-hover:text-[#0f1b2d]"><HighlightText text={vnd.name}
                                                                                                        query={searchQuery}/></span>
                </Link>

                {(meta || reasons.length > 0) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                        {meta}
                        {reasons.length > 0 && (
                            <span className="relative z-10 ml-auto inline-flex items-center gap-1">
                            {VND_BOARD_REASON_ORDER.filter((r) => reasons.includes(r)).map((r) => {
                                const reason = VND_BOARD_REASON_META[r];
                                return (
                                    <Tooltip key={r} content={t(reason.tooltip)}>
                                        <span
                                            className="rounded-md px-1.5 py-[1px] text-[10.5px] font-semibold leading-[16px]"
                                            style={{color: reason.color, background: reason.bg}}
                                        >
                                            {t(reason.label)}
                                        </span>
                                    </Tooltip>
                                );
                            })}
                        </span>
                        )}
                    </div>
                )}

                {vnd.developerName && (
                    <div
                        className="mt-2 flex items-center gap-1.5 border-t border-dashed border-[#eef2f7] pt-2 text-[11px] text-[#8b97ab]">
                        <Building2 className="h-3 w-3 flex-none" strokeWidth={2}/>
                        <span className="truncate">{vnd.developerName}</span>
                    </div>
                )}
            </article>

            <ConfirmActionModal
                open={confirmHideOpen}
                onClose={() => setConfirmHideOpen(false)}
                onConfirm={() => {
                    setConfirmHideOpen(false);
                    onRemove?.(vnd, "hide");
                }}
                variant="primary"
                icon={RemoveIcon}
                title={t("vndBoard.confirmHide.title", "Убрать с доски?")}
                message={t("vndBoard.confirmHide.message", {
                    code: vnd.code,
                    defaultValue: "Документ {{code}} больше не будет отображаться на вашей доске.",
                })}
                confirmLabel={t("vndBoard.confirmHide.confirm", "Убрать")}
                accent="violet"
            />
        </>
    );
}

function MetaLine({icon: Icon, children}: { icon: typeof CalendarClock; children: ReactNode }) {
    return (
        <span className="inline-flex min-w-0 items-center gap-1 text-[11.5px] text-[#55617a]">
            <Icon className="h-3 w-3 flex-none text-[#8b97ab]" strokeWidth={2}/>
    <span className="truncate">{children}</span>
</span>
    )
        ;
}
