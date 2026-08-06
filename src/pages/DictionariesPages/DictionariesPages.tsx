// Страница "Справочники"
import {useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {getRefSections} from "@/constants/getRefSections.ts";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";

export function DictionariesPages() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const REF_SECTIONS = useMemo(() => getRefSections(t), [t]);

    const filteredSections = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return REF_SECTIONS;

        return REF_SECTIONS.map((section) => ({
            ...section,
            items: section.items.filter(
                (item) =>
                    item.title.toLowerCase().includes(term) ||
                    item.subtitle.toLowerCase().includes(term)
            ),
        })).filter((section) => section.items.length > 0);
    }, [REF_SECTIONS, search]);

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <div className="mb-[6px]">
                <h1 className="m-0 text-[23px] font-bold tracking-[-0.02em] text-[#1c2740]">
                    {/* Справочники */}
                    {t("dictionaries.title")}
                </h1>
                <p className="mt-[6px] mb-4 text-[13px] text-[#8b97ab]">
                    {/* Настраиваемые администратором справочники системы */}
                    {t("dictionaries.subtitle")}
                </p>
            </div>

            <div className="mb-6">
                <SearchBar
                    /* Поиск по справочникам… */
                    placeholder={t("dictionaries.searchPlaceholder")}
                    value={search}
                    onChange={setSearch}
                    className="min-w-[280px]"
                />
            </div>

            {filteredSections.length === 0 ? (
                <div className="text-[13px] text-[#8b97ab] text-center py-10">
                    {/* Ничего не найдено */}
                    {t("dictionaries.notFound")}
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {filteredSections.map((section) => (
                        <div key={section.key}>
                            <div className="text-[11px] font-bold tracking-[.05em] uppercase text-[#a3adbd] mb-3">
                                {section.title}
                            </div>
                            <div className="grid grid-cols-3 gap-3.5">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isDisabled = section.disabled;

                                    const card = (
                                        <button
                                            key={item.key}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => {
                                                if (!isDisabled && item.path) navigate(item.path);
                                            }}
                                            className={
                                                isDisabled
                                                    ? "w-full flex flex-col items-start gap-0 p-[18px_20px] border border-[#e9edf3] rounded-[14px] bg-[#fafbfc] text-left cursor-not-allowed opacity-60"
                                                    : "w-full flex flex-col items-start gap-0 p-[18px_20px] border border-[#e9edf3] rounded-[14px] bg-white text-left cursor-pointer transition-colors hover:border-[#4e57d6] hover:bg-[#fbfcff]"
                                            }
                                        >
                                            <div className="flex items-center justify-between w-full mb-3">
                                                <span
                                                    className={
                                                        isDisabled
                                                            ? "w-[38px] h-[38px] rounded-[10px] bg-[#eef0f2] text-[#a3adbd] grid place-items-center"
                                                            : "w-[38px] h-[38px] rounded-[10px] bg-[#eef0fd] text-[#4e57d6] grid place-items-center"
                                                    }
                                                >
                                                    <Icon className="w-5 h-5" strokeWidth={1.7} />
                                                </span>
                                                <span className="font-mono text-[13px] font-bold text-[#c3ccd8]">
                                                    {item.code}
                                                </span>
                                            </div>
                                            <div
                                                className={
                                                    isDisabled
                                                        ? "font-bold text-[14px] text-[#a3adbd]"
                                                        : "font-bold text-[14px] text-[#1c2740]"
                                                }
                                            >
                                                <HighlightText text={item.title} query={search} />
                                            </div>
                                            <div className="text-[12px] text-[#8b97ab] mt-[5px] leading-[1.45]">
                                                <HighlightText text={item.subtitle} query={search} />
                                            </div>
                                        </button>
                                    );

                                    if (!isDisabled) return card;

                                    return (
                                        <Tooltip
                                            key={item.key}
                                            /* В разработке */
                                            content={t("dictionaries.inDevelopment")}
                                            side="top"
                                            className="w-full"
                                        >
                                            {card}
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}