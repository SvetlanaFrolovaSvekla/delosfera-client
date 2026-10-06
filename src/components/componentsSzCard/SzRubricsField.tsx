// Рубрики записки: выбор в модальном окне с деревом для редактируемой записки и чипы для просмотра.
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {labelClass} from "@/components/componentsSzCard/szCardUtils.ts";

interface SzRubricsFieldProps {
    value: number[];
    onChange: (ids: number[]) => void;
    editable: boolean;
}

export function SzRubricsField({value, onChange, editable}: SzRubricsFieldProps) {
    const {t} = useTranslation();
    const {rubrics, rubricOptions} = useDictionaries();

    return (
        <div className="mt-4">
            {editable ? (
                <MultiSelectField
                    label={t("szCard.fields.rubrics")}
                    modalTitle={t("szCard.fields.rubrics")}
                    options={rubricOptions}
                    selectedKeys={value.map(String)}
                    onChange={(keys) => onChange(keys.map(Number))}
                    searchPlaceholder={t("szCard.fields.rubricsSearch")}
                    hierarchical
                    boldLabel={false}
                />
            ) : (
                <>
                    <span className={labelClass}>{t("szCard.fields.rubrics")}</span>
                    <div className="flex flex-wrap gap-2">
                        {value.length === 0 ? (
                            <span className="text-[13px] text-[#8b97ab]">—</span>
                        ) : rubrics.filter((r) => value.includes(Number(r.id))).map((r) => (
                            <span key={r.id}
                                  className="h-8 inline-flex items-center px-3 rounded-full border border-[#cbddff] bg-[#e9f0ff] text-[12.5px] font-semibold text-[#2f68f5]">
                                {r.name}
                            </span>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
