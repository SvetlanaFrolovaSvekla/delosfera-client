// Панель переключения языка содержимого редакции (RU/KG/EN)
import {Fragment} from "react";
import {useTranslation} from "react-i18next";
import type {VndRedactionResponse} from "@/service/vndService/vndServiceType.ts";
import {LANGUAGE_TABS, type RedactionLanguage} from "@/utils/redactionLanguagePanelUtils.ts";
import {Tooltip} from "@/components/componentsGeneral/Tooltip";
import {Check, Lock} from "lucide-react";

interface RedactionLanguageTabsPanelProps {
    selected: VndRedactionResponse;
    activeLanguage: RedactionLanguage;
    onChange: (lang: RedactionLanguage) => void;
}

export function RedactionLanguageTabsPanel({
                                               selected,
                                               activeLanguage,
                                               onChange,
                                           }: RedactionLanguageTabsPanelProps) {
    const {t} = useTranslation();

    return (
        <div className="rounded-[14px] border border-[#e9edf3] bg-white p-[14px]">
            <div className="px-1 pb-[10px] pt-[2px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                {/* Язык документа */}
                {t("openVndPage.languageTabsPanel.title")}
            </div>

            <div className="flex flex-col rounded-[9px] bg-[#f2f5f9] p-[3px]">
                {LANGUAGE_TABS.map((tab, index) => {
                    const available = selected[tab.fileKey] !== null;
                    const active = available && activeLanguage === tab.code;
                    const prevActive = index > 0 && available && LANGUAGE_TABS[index - 1].code === activeLanguage;
                    const showDivider = index > 0 && !active && !prevActive;

                    const button = (
                        <button
                            onClick={() => available && onChange(tab.code)}
                            disabled={!available}
                            className="flex h-8 w-full items-center justify-between rounded-[6px] px-2.5 text-[12.5px] font-semibold transition-colors"
                            style={
                                !available
                                    ? {color: "#c3ccd8", cursor: "not-allowed"}
                                    : active
                                        ? {
                                            background: "#fff",
                                            color: "var(--app-accent, #4e57d6)",
                                            boxShadow: "0 1px 2px rgba(15,27,45,.08)",
                                            cursor: "pointer",
                                        }
                                        : {color: "#5d616c", cursor: "pointer"}
                            }
                        >
                            <span>{tab.label}</span>
                            {!available ? (
                                <Lock size={12} strokeWidth={2} className="flex-none opacity-70"/>
                            ) : active ? (
                                <Check size={14} strokeWidth={2.5} className="flex-none"/>
                            ) : null}
                        </button>
                    );

                    return (
                        <Fragment key={tab.code}>
                            {showDivider && (
                                <div className="h-px shrink-0 bg-gradient-to-r from-transparent via-[#dde2ea] to-transparent"/>
                            )}
                            <div className="grid py-[2.5px]">
                                {available ? (
                                    button
                                ) : (
                                    <Tooltip content={t("openVndPage.languageTabsPanel.unavailableHint")} side="right">
                                        {button}
                                    </Tooltip>
                                )}
                            </div>
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
}
