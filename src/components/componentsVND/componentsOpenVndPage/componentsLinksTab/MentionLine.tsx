// Одна ссылка внутри группы документа: где упомянута (редакция + фрагмент), на какой фрагмент
// другого документа указывает, и кнопки "показать в тексте" / "удалить"
import {useTranslation} from "react-i18next";
import type {VndLinkItem} from "@/service/vndService/vndServiceType.ts";
import {RedactionPill} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/RedactionPill.tsx";
import {languageShortLabel, shortFragment} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/vndLinkUi.ts";
import {
    isLegacyLink, type LinksSubTab
} from "@/components/componentsVND/componentsOpenVndPage/componentsLinksTab/vndLinksTabUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {ArrowUpRight, CornerDownRight, FileText, Search, Sparkles, TextSelect, X} from "lucide-react";

export function MentionLine({link, perspective, canDelete, disabled, onDelete, onShowSource, onShowTarget}: {
    link: VndLinkItem;
    perspective: LinksSubTab;
    canDelete: boolean;
    disabled: boolean;
    onDelete: () => void;
    onShowSource: () => void;
    onShowTarget: () => void;
}) {
    const {t} = useTranslation();
    const source = link.source;
    const target = link.target;
    const legacy = isLegacyLink(link);

    return (
        <div className="group/line flex min-h-[30px] items-center gap-2 rounded-[8px] px-1.5 py-1 hover:bg-white">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                {source ? (
                    <>
                        <RedactionPill number={source.redactionNumber} lang={source.documentTarget}
                                       current={source.isCurrentRedaction} code={source.redactionCode}/>
                        {legacy ? (
                            <Tooltip content={t("openVndPage.linksTab.autoDetectedTooltip")} side="top">
                                <span className="flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">
                                    <Sparkles size={10} strokeWidth={2}/> {t("openVndPage.linksTab.autoDetectedBadge")}
                                </span>
                            </Tooltip>
                        ) : (
                            <span className="flex min-w-0 items-center gap-1 text-[12px] text-[#2c3446]">
                                <TextSelect size={12} strokeWidth={2} className="flex-none text-[#4e57d6]"/>
                                <span className="truncate italic">«{shortFragment(source.text, 110)}»</span>
                            </span>
                        )}
                    </>
                ) : (
                    <span className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                        <FileText size={12} strokeWidth={2}/>
                        {t("openVndPage.linksTab.withoutMention")}
                    </span>
                )}

                {target && (
                    <span className="flex min-w-0 items-center gap-1 text-[11.5px] text-[#55617a]">
                        <CornerDownRight size={12} strokeWidth={2} className="flex-none text-emerald-600"/>
                        <span className="truncate">
                            {perspective === "outgoing"
                                ? t("openVndPage.linksTab.toFragmentOfTarget", {fragment: shortFragment(target.text, 70)})
                                : t("openVndPage.linksTab.toFragmentOfThis", {fragment: shortFragment(target.text, 70)})}
                        </span>
                        <span className="flex-none rounded bg-emerald-50 px-1 text-[10px] font-semibold text-emerald-700">
                            Р{target.redactionNumber}{languageShortLabel(target.documentTarget) ? ` · ${languageShortLabel(target.documentTarget)}` : ""}
                        </span>
                    </span>
                )}
            </div>

            <div className="flex flex-none items-center gap-0.5">
                {source && (
                    <Tooltip content={perspective === "outgoing"
                        ? t("openVndPage.linksTab.showInTextTooltip")
                        : t("openVndPage.linksTab.showInSourceTextTooltip")} side="top">
                        <button type="button" onClick={onShowSource}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#ececfc] hover:text-[#4e57d6]">
                            <Search size={14} strokeWidth={2.2}/>
                        </button>
                    </Tooltip>
                )}
                {target && (
                    <Tooltip content={perspective === "outgoing"
                        ? t("openVndPage.linksTab.showTargetPlaceTooltip")
                        : t("openVndPage.linksTab.showThisPlaceTooltip")} side="top">
                        <button type="button" onClick={onShowTarget}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-emerald-600/70 hover:bg-emerald-50 hover:text-emerald-700">
                            <ArrowUpRight size={14} strokeWidth={2.2}/>
                        </button>
                    </Tooltip>
                )}
                {canDelete && (
                    <Tooltip content={t("openVndPage.linksTab.deleteLinkTooltip")} side="top">
                        <button type="button" onClick={onDelete} disabled={disabled}
                                className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] text-[#c3ccd8] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover/line:opacity-100 disabled:opacity-40">
                            <X size={14} strokeWidth={2}/>
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}
