// Блок "Замечания к тексту" панели резолюции: карточки замечаний к фрагментам редакции.
// Состояние (список, фокус, подсветка) живёт в VndApproverResolutionPanel - здесь только разметка.
import type {RefObject} from "react";
import {useTranslation} from "react-i18next";
import {Quote, Search, Trash2, TextQuote} from "lucide-react";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {HelpTooltip} from "@/components/componentsGeneral/knowledgeBaseComponents/HelpTooltip.tsx";
import type {DraftTextRemark} from "./resolutionPanelTypes.ts";

interface ResolutionRemarksSectionProps {
    remarks: DraftTextRemark[];
    /** Карточка, которую только что добавили - коротко подсвечивается. */
    flashRemarkId: number | null;
    /** Поля "Замечание" карточек - родитель ставит фокус в только что добавленную карточку. */
    noteRefs: RefObject<Map<number, HTMLTextAreaElement>>;
    onCiteRequest?: () => void;
    onJumpToQuote?: (remark: DraftTextRemark) => void;
    onNoteChange: (id: number, note: string) => void;
    onRemoveRemark: (id: number) => void;
}

export function ResolutionRemarksSection({
    remarks, flashRemarkId, noteRefs, onCiteRequest, onJumpToQuote, onNoteChange, onRemoveRemark,
}: ResolutionRemarksSectionProps) {
    const {t} = useTranslation();
    return (
        <div className="mt-4 rounded-[12px] border border-[#e9edf3] bg-[#fbfcfe] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-[12.5px] font-semibold text-[#1c2740]">
                    <TextQuote size={14} className="text-[#4e57d6]"/>
                    {t("resolutionPanel.remarksTitle")}{remarks.length > 0 ? ` (${remarks.length})` : ""}
                    <HelpTooltip
                        content={t("resolutionPanel.remarksHelp")}
                        side="bottom"
                        className="h-5 w-5"
                    />
                </span>
                {onCiteRequest && (
                    <button
                        type="button"
                        onClick={onCiteRequest}
                        className="cursor-pointer inline-flex items-center gap-1.5 rounded-[8px] border border-[#d7dee8] bg-white px-3 py-[6px] text-[12px] font-semibold text-[#4e57d6] hover:bg-[#ececfc]"
                    >
                        <Quote size={13}/>
                        {t("resolutionPanel.addRemark")}
                    </button>
                )}
            </div>

            {remarks.length === 0 ? (
                <div className="mt-2 text-[11.5px] leading-[1.5] text-[#8b97ab]">
                    {t("resolutionPanel.remarksEmptyHint")}
                </div>
            ) : (
                <div className="mt-2.5 flex flex-col gap-2">
                    {remarks.map((r, index) => (
                        <div
                            key={r.id}
                            className={`rounded-[10px] border bg-white px-3 py-2.5 transition-shadow ${
                                flashRemarkId === r.id
                                    ? "border-[#4e57d6] shadow-[0_0_0_3px_#ececfc]"
                                    : "border-[#e9edf3]"
                            }`}
                        >
                            <div className="flex items-start gap-2">
                                <span className="mt-[1px] flex h-[18px] min-w-[18px] flex-none items-center justify-center rounded-full bg-[#ececfc] px-1 text-[10px] font-bold text-[#4e57d6]">
                                    {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.03em] text-[#a3adbd]">
                                        {t("resolutionPanel.fragment")} · {t(`resolutionPanel.targets.${r.documentTarget}`, {defaultValue: r.documentTarget})}
                                    </div>
                                    <Tooltip content={r.displayText} side="top" className="block min-w-0">
                                        <div className="mt-0.5 line-clamp-3 break-words border-l-2 border-[#4e57d6]/50 pl-2 text-[12px] italic leading-[1.45] text-[#3a4560]">
                                            «{r.displayText}»
                                        </div>
                                    </Tooltip>
                                </div>
                                <div className="flex flex-none items-center gap-1">
                                    {onJumpToQuote && (
                                        <Tooltip content={t("resolutionPanel.showInText")} side="top">
                                            <button
                                                type="button"
                                                onClick={() => onJumpToQuote(r)}
                                                className="cursor-pointer grid h-[24px] w-[24px] place-items-center rounded-[7px] text-[#4e57d6] hover:bg-[#ececfc]"
                                            >
                                                <Search size={13}/>
                                            </button>
                                        </Tooltip>
                                    )}
                                    <Tooltip content={t("resolutionPanel.deleteRemark")} side="top">
                                        <button
                                            type="button"
                                            onClick={() => onRemoveRemark(r.id)}
                                            className="cursor-pointer grid h-[24px] w-[24px] place-items-center rounded-[7px] text-[#8b97ab] hover:bg-[#fdf1f1] hover:text-[#c0392b]"
                                        >
                                            <Trash2 size={13}/>
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                            <textarea
                                ref={(el) => {
                                    if (el) noteRefs.current.set(r.id, el);
                                    else noteRefs.current.delete(r.id);
                                }}
                                value={r.note}
                                onChange={(e) => onNoteChange(r.id, e.target.value)}
                                placeholder={t("resolutionPanel.remarkPlaceholder")}
                                rows={2}
                                className="mt-2 w-full resize-y rounded-[8px] border border-[#e9edf3] bg-[#fbfcfe] px-3 py-2 text-[12.5px] text-[#1c2740] outline-none focus:border-[#4e57d6] focus:bg-white"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
