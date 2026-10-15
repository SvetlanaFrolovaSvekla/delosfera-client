// Рубрики записки: выбор в модальном окне с деревом для редактируемой записки и чипы для просмотра.
import {useTranslation} from "react-i18next";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {labelClass} from "@/utils/szProcess/szCardUtils.ts";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";

/**
 * Сколько рубрик-«таблеток» показывать в просмотре. Записка может лежать в десятках
 * рубрик — остальные сворачиваются в кружок «+N», названия — в подсказке через запятую.
 */
const MAX_VISIBLE_RUBRICS = 30;

interface SzRubricsFieldProps {
    value: number[];
    onChange: (ids: number[]) => void;
    editable: boolean;
}

export function SzRubricsField({value, onChange, editable}: SzRubricsFieldProps) {
    const {t} = useTranslation();
    const {rubrics, rubricOptions} = useDictionaries();

    const selected = rubrics.filter((r) => value.includes(Number(r.id)));
    const visible = selected.slice(0, MAX_VISIBLE_RUBRICS);
    const hidden = selected.slice(MAX_VISIBLE_RUBRICS);

    return (
        <div className="mt-4">
            {editable ? (
                <MultiSelectField
                    accent="blue"
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
                        {selected.length === 0 ? (
                            <span className="text-[13px] text-[#8b97ab]">—</span>
                        ) : (
                            <>
                                {visible.map((r) => (
                                    <span key={r.id}
                                          className="h-8 inline-flex items-center px-3 rounded-full border border-[#cbddff] bg-[#e9f0ff] text-[12.5px] font-semibold text-[#2f68f5]">
                                        {r.name}
                                    </span>
                                ))}
                                {hidden.length > 0 && (
                                    <Tooltip content={hidden.map((r) => r.name).join(", ")} side="top">
                                        <span
                                            className="h-8 min-w-8 inline-flex items-center justify-center px-2 rounded-full border border-[#2f68f5] bg-[#2f68f5] text-[12px] font-bold text-white cursor-default">
                                            +{hidden.length}
                                        </span>
                                    </Tooltip>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
