// Большая панель: текст выбранной редакции на выбранном языке
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {buildRedactionFileName} from "@/utils/fileNaming.ts";
import type {RedactionLanguage} from "@/utils/redactionLanguagePanelUtils.ts";
import {FileText} from "lucide-react";

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
    const {t} = useTranslation();
    const fileId = selected[FILE_KEY_BY_LANG[activeLanguage]] as number | null;

    if (fileId === null) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 p-[48px] text-center text-[13px] text-[#8b97ab]">
                <FileText size={22} className="text-[#c3ccd8]"/>
                {t("openVndPage.redactionTextView.noTextInLanguage")}
            </div>
        );
    }

    // TODO: временная заглушка вместо DocxEditor (SuperDoc убран)
    const fileName = buildRedactionFileName(selected.code, vnd.name, activeLanguage);

    return (
        <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto rounded-[12px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 p-[48px] text-center text-[13px] text-[#8b97ab]">
                    <FileText size={22} className="text-[#c3ccd8]"/>
                    <span>Предпросмотр документа временно недоступен!</span>
                    <span className="text-[#c3ccd8]">{fileName}</span>
                </div>
            </div>
        </div>
    );
}