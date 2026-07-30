import {Calendar, Columns2, Paperclip, Plus} from "lucide-react";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {formatDate} from "@/utils/dateUtils.ts";
import {getRedactionDisplayStatus, REDACTION_STATUS_META} from "@/utils/redactionStatus.ts";

interface RedactionsSidebarProps {
    redactions: VndRedactionResponse[];
    selectedId: number | undefined;
    onSelect: (id: number) => void;
    uploadBlocked: boolean;
    lastByNumber: VndRedactionResponse | undefined;
    onUpload: () => void;
    compareMode: boolean;
    onToggleCompare: () => void;
}

export function RedactionsSidebar({
                                      redactions,
                                      selectedId,
                                      onSelect,
                                      uploadBlocked,
                                      lastByNumber,
                                      onUpload,
                                      compareMode,
                                      onToggleCompare,
                                  }: RedactionsSidebarProps) {
    return (
        <div className="rounded-[14px] border border-[#e9edf3] bg-white p-[14px]">
            <div className="px-1 pb-[10px] pt-[2px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                Редакции документа
            </div>

            <div className="flex flex-col gap-2">
                {redactions.map((e) => (
                    <RedactionListItem
                        key={e.id}
                        redaction={e}
                        active={e.id === selectedId}
                        onClick={() => onSelect(e.id)}
                    />
                ))}
            </div>

            <div className="mt-[11px] flex flex-col gap-1">
                <button
                    onClick={onUpload}
                    disabled={uploadBlocked}
                    className="cursor-pointer flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#4e57d6] text-[12.5px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:bg-[#c7cbe6]"
                >
                    <Plus size={16} strokeWidth={2}/>
                    Новая редакция
                </button>
                {uploadBlocked && (
                    <p className="px-1 text-[11px] leading-[1.4] text-[#9a6408]">
                        Р{lastByNumber?.number} ещё не завершена — сначала отправьте и дождитесь решения.
                    </p>
                )}
            </div>

            <button
                onClick={onToggleCompare}
                className={`cursor-pointer mt-2 flex h-[38px] w-full items-center justify-center gap-2 rounded-[10px] border text-[12.5px] font-semibold transition-colors ${
                    compareMode
                        ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06] text-[#4e57d6]"
                        : "border-[#e5e9f0] bg-white text-[#3a4560] hover:bg-[#f6f8fb]"
                }`}
            >
                <Columns2 size={16} strokeWidth={1.8}/>
                Сравнение редакций
            </button>
        </div>
    );
}

function RedactionListItem({
                               redaction,
                               active,
                               onClick,
                           }: {
    redaction: VndRedactionResponse;
    active: boolean;
    onClick: () => void;
}) {
    const status = getRedactionDisplayStatus(redaction);
    const meta = REDACTION_STATUS_META[status];

    return (
        <button
            onClick={onClick}
            className={`cursor-pointer flex items-start gap-2 rounded-[10px] border p-2 text-left transition-colors ${
                active
                    ? "border-[#4e57d6]/30 bg-[#4e57d6]/[0.06]"
                    : "border-transparent hover:bg-[#f6f8fb]"
            }`}
        >
            <span className="w-[38px] flex-none font-mono text-[13px] font-bold text-[#1c2740]">
                Р{redaction.number}
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-[7px]">
                    <span className="text-[12.5px] font-semibold text-[#26324a]">{redaction.code}</span>
                    <span
                        className="rounded-[5px] px-[6px] py-[1px] text-[9.5px] font-bold"
                        style={{color: meta.color, background: meta.bg}}
                    >
                        {meta.label}
                    </span>
                </span>

                <span className="mt-[4px] flex items-center gap-[10px] text-[11px] text-[#3c424a]">
                    <span className="flex items-center gap-[4px]">
                        <Calendar size={12} className="flex-none"/>
                        {formatDate(redaction.createdAt)}
                    </span>
                    <span className="flex items-center gap-[4px]">
                        <Paperclip size={12} className="flex-none"/>
                        {redaction.attachmentFileIds.length}
                    </span>
                </span>

                {redaction.description && (
                    <span className="mt-[5px] line-clamp-5 block text-[11.5px] leading-[1.5] text-[#55617a]">
                        {redaction.description}
                    </span>
                )}
            </span>
        </button>
    );
}