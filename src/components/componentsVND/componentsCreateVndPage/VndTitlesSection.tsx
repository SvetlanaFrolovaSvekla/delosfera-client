import {useState} from "react";
import {VND_TITLE_MAX_LENGTH, VND_TITLE_MIN_LENGTH} from "@/constants/validation/vndValidation.ts";

interface VndTitlesSectionProps {
    titleRu: string;
    onTitleRuChange: (v: string) => void;
    titleKy: string;
    onTitleKyChange: (v: string) => void;
    titleEn: string;
    onTitleEnChange: (v: string) => void;
}

const baseInputClass =
    "w-full h-10 px-3 rounded-[9px] border bg-white text-[13px] text-[#1c2740] outline-none box-border transition-colors";

const normalInputClass =
    "border-[#e5e9f0] focus:border-[#4e57d6] focus:ring-[3px] focus:ring-[#ececfc]";

const errorInputClass =
    "border-[#e0a5a0] focus:border-[#c0392b] focus:ring-[3px] focus:ring-[#fdecec]";

function CharCounter({length}: { length: number }) {
    const nearLimit = VND_TITLE_MAX_LENGTH - length <= 20;
    return (
        <span
            className={`text-[11px] font-medium tabular-nums ${
                nearLimit ? "text-[#c0392b]" : "text-[#a3adbd]"
            }`}
        >
            {length}/{VND_TITLE_MAX_LENGTH}
        </span>
    );
}

interface TitleFieldProps {
    label: string;
    required?: boolean;
    boldLabel?: boolean;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}

function TitleField({label, required = false, boldLabel = true, value, onChange, placeholder}: TitleFieldProps) {
    const [touched, setTouched] = useState(false);

    const trimmedLength = value.trim().length;
    const isTooShort = trimmedLength > 0 && trimmedLength < VND_TITLE_MIN_LENGTH;
    const isMissing = required && trimmedLength === 0;
    const showError = touched && (isTooShort || isMissing);

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <label className={`text-[12px] ${boldLabel ? "font-semibold" : "font-medium"} text-[#3a4560]`}>
                    {label} {required && <span className="text-[#c0392b]">*</span>}
                </label>
                <CharCounter length={value.length}/>
            </div>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => setTouched(true)}
                maxLength={VND_TITLE_MAX_LENGTH}
                placeholder={placeholder}
                className={`${baseInputClass} ${showError ? errorInputClass : normalInputClass}`}
            />
            {showError && (
                <p className="mt-1 text-[11px] text-[#c0392b]">
                    {isMissing ? "Обязательное поле" : `Минимум ${VND_TITLE_MIN_LENGTH} символа`}
                </p>
            )}
        </div>
    );
}

export function VndTitlesSection({
                                     titleRu, onTitleRuChange,
                                     titleKy, onTitleKyChange,
                                     titleEn, onTitleEnChange,
                                 }: VndTitlesSectionProps) {
    return (
        <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                Заголовки
            </div>
            <div className="flex flex-col gap-3">
                <TitleField
                    label="Заголовок (рус)"
                    required
                    value={titleRu}
                    onChange={onTitleRuChange}
                    placeholder="Наименование документа"
                />
                <TitleField
                    label="Заголовок (кырг)"
                    boldLabel={false}
                    value={titleKy}
                    onChange={onTitleKyChange}
                    placeholder="Документтин аталышы"
                />
                <TitleField
                    label="Заголовок (англ)"
                    value={titleEn}
                    onChange={onTitleEnChange}
                    placeholder="Document title"
                />
            </div>
        </div>
    );
}