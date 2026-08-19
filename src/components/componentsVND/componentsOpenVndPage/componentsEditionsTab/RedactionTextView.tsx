// Большая панель: текст выбранной редакции на выбранном языке
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {buildRedactionFileName} from "@/utils/fileNaming.ts";
import {FileText} from "lucide-react";
import type {RedactionLanguage} from "./RedactionLanguageTabsPanel.tsx";
import {DocxEditor} from "@/components/componentsDocxEditor/DocxEditor.tsx";

interface RedactionTextViewProps {
    vnd: VndResponse;
    selected: VndRedactionResponse;
    activeLanguage: RedactionLanguage;
    downloadingId: number | null;
    onDownload: (fileId: number, name: string) => void;
}

const FILE_KEY_BY_LANG: Record<RedactionLanguage, "docFileRuId" | "docFileKgId" | "docFileEnId"> = {
    ru: "docFileRuId",
    kg: "docFileKgId",
    en: "docFileEnId",
};

export function RedactionTextView({
                                      vnd,
                                      selected,
                                      activeLanguage
                                  }: RedactionTextViewProps) {
    const fileId = selected[FILE_KEY_BY_LANG[activeLanguage]] as number | null;

    if (fileId === null) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#8b97ab]">
                <FileText size={22} className="text-[#c3ccd8]"/>
                Текст на этом языке отсутствует
            </div>
        );
    }

    const fileName = buildRedactionFileName(selected.code, vnd.name, activeLanguage);

    return (
        <div className="flex h-full flex-col">

            <div className="min-h-0 flex-1 overflow-y-auto rounded-[12px] border border-[#e5e9f0]">
                <DocxEditor key={fileId} fileId={fileId} fallbackName={fileName} editable={false}/>
            </div>
        </div>
    );
}