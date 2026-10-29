// Группа компонентов для выбора даты (для выбора периода)
import {useTranslation} from "react-i18next";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {ACCENT, type Accent, type AccentClasses} from "@/constants/accent.ts";

export interface DateFilterValue {
    mode: "exact" | "range";
    exact: string;
    from: string;
    to: string;
}

export interface DateFilterRowConfig {
    key: string;
    label: string;
    value: DateFilterValue;
    onChange: (value: DateFilterValue) => void;
    codeLabel?: string;
    codeValue?: string;
    onCodeChange?: (value: string) => void;
    placeholderNumber?: string;
}

interface DateFilterGroupProps {
    rows: DateFilterRowConfig[];
    /** Акцентный цвет календариков и поля номера. По умолчанию фиолетовый. */
    accent?: Accent;
}

const codeInputClass = (a: AccentClasses) =>
    `h-[36px] px-2.5 rounded-[8px] border border-[#e5e9f0] bg-white text-[12.5px] text-[#1c2740] outline-none box-border ${a.focusBorder} w-full`;

// Колонки: подпись | точная | «или» | с | «–» | по | (№ — только если в группе есть номер).
// Ширины гибкие (110–150px на поле даты): раньше сетка была жёсткой (~806px) с пустой колонкой
// номера, и в карточках на пол-экрана («Изменения», «Актуализация») поля вылезали за край.
const DATE_COL = "minmax(110px,150px)";
const gridCols = (withCode: boolean) =>
    ["minmax(130px,max-content)", DATE_COL, "22px", DATE_COL, "14px", DATE_COL, ...(withCode ? [DATE_COL] : [])].join(" ");

export function DateFilterGroup({rows, accent = "violet"}: DateFilterGroupProps) {
    const {t} = useTranslation();
    const a = ACCENT[accent];
    const hasAnyCode = rows.some((r) => r.codeLabel);

    return (
        <div className="grid gap-x-2.5 gap-y-1.5 items-center" style={{gridTemplateColumns: gridCols(hasAnyCode)}}>
            <div/>
            {/* точная */}
            <div className="text-[10.5px] text-[#a3adbd]">{t("dateFilterGroup.exactLabel")}</div>
            <div/>
            {/* диапазон */}
            <div className="text-[10.5px] text-[#a3adbd] col-span-3">{t("dateFilterGroup.rangeLabel")}</div>
            {/* № — колонка есть, только если хотя бы в одной строке группы есть номер */}
            {hasAnyCode && <div className="text-[10.5px] text-[#a3adbd]">{t("dateFilterGroup.numberColumn")}</div>}

            {rows.map((row) => {
                const setExact = (v: string) => row.onChange({mode: "exact", exact: v, from: "", to: ""});
                const setFrom = (v: string) => row.onChange({mode: "range", exact: "", from: v, to: row.value.to});
                const setTo = (v: string) => row.onChange({mode: "range", exact: "", from: row.value.from, to: v});

                return (
                    <div key={row.key} className="contents">
                        <span className="text-[12px] text-[#55617a] whitespace-nowrap">{row.label}</span>

                        <DatePickerInput value={row.value.exact} onChange={setExact} accent={accent}/>

                        {/* или */}
                        <span className="text-[11.5px] text-[#a3adbd] text-center">{t("dateFilterGroup.or")}</span>

                        <DatePickerInput value={row.value.from} onChange={setFrom} accent={accent}/>

                        <span className="text-[#a3adbd] text-center">–</span>

                        <DatePickerInput value={row.value.to} onChange={setTo} accent={accent}/>

                        {hasAnyCode && (row.codeLabel && row.onCodeChange ? (
                            <input
                                type="text"
                                placeholder={row.codeLabel || t("dateFilterGroup.numberPlaceholder")} /* номер */
                                value={row.codeValue ?? ""}
                                onChange={(e) => row.onCodeChange!(e.target.value)}
                                className={codeInputClass(a)}
                            />
                        ) : (
                            <div/>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}