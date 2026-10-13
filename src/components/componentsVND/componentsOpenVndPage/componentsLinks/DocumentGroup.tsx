// Документ на другой стороне ссылок (шифр, статус, название) + все его ссылки (MentionLine)
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ChevronRight} from "lucide-react";
import type {VndLinkItem} from "@/service/vndService/vndServiceType.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {MentionLine} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/MentionLine.tsx";
import {LINK_STATUS_STYLES} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/vndLinkUi.ts";
import {
    isLegacyLink, type DocGroup, type LinksSubTab
} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/vndLinksTabUtils.ts";

export function DocumentGroup({group, perspective, canDelete, disabled, onDelete, onShowSource, onShowTarget}: {
    group: DocGroup;
    perspective: LinksSubTab;
    canDelete: boolean;
    disabled: boolean;
    onDelete: (link: VndLinkItem) => void;
    onShowSource: (link: VndLinkItem) => void;
    onShowTarget: (link: VndLinkItem) => void;
}) {
    const {t} = useTranslation();
    return (
        <div className="rounded-xl px-3 py-3 transition-colors hover:bg-slate-50/70">
            <div className="flex items-center gap-3">
                <span className="w-9 h-9 flex-none rounded-[9px] bg-[#f2f5f9] text-[#55617a] grid place-items-center font-mono text-[10px] font-semibold">
                    {group.code.slice(0, 3)}
                </span>
                <Link to={`/base-vnd/${group.vndId}`} className="group/doc flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                        <span className="font-mono text-[11.5px] font-semibold text-[#4e57d6] group-hover/doc:underline">{group.code}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${LINK_STATUS_STYLES[group.status] ?? "text-slate-500 bg-slate-100"}`}>
                            {t(`openVndPage.linksTab.statuses.${group.status}`, {defaultValue: group.status})}
                        </span>
                    </span>
                    <span className="block text-[12.5px] text-[#55617a] mt-0.5 truncate">{group.title}</span>
                </Link>
                <Tooltip content={t("openVndPage.linksTab.openDocumentTooltip")} side="left">
                    <Link to={`/base-vnd/${group.vndId}`}
                          className="grid h-8 w-8 flex-none place-items-center rounded-[8px] text-[#c3ccd8] hover:bg-white hover:text-[#4e57d6]">
                        <ChevronRight size={16} strokeWidth={2}/>
                    </Link>
                </Tooltip>
            </div>

            <div className="ml-[48px] mt-1.5 flex flex-col gap-0.5 border-l-2 border-[#eef2f7] pl-3">
                {group.links.map((link) => (
                    <MentionLine
                        key={link.id}
                        link={link}
                        perspective={perspective}
                        canDelete={canDelete && !isLegacyLink(link)}
                        disabled={disabled}
                        onDelete={() => onDelete(link)}
                        onShowSource={() => onShowSource(link)}
                        onShowTarget={() => onShowTarget(link)}
                    />
                ))}
            </div>
        </div>
    );
}
