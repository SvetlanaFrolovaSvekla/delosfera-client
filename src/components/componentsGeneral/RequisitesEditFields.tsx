// Поля для ввода/выбора для редактирования реквизитов ВНД
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {formatDate, parseDDMMYYYYToISO} from "@/utils/dateUtils.ts";

interface EditableTextFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
}

export function EditableTextField({label, value, onChange, placeholder, required}: EditableTextFieldProps) {
    return (
        <div className="min-w-0">
            <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                {label} {required && <span className="text-[#c0392b]">*</span>}
            </span>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-10 min-w-0 px-3 rounded-[9px] border border-[#e5e9f0] bg-white outline-none text-[13px] text-[#1c2740] box-border focus:border-[#4e57d6] focus:ring-[3px] focus:ring-[#ececfc]"
            />
        </div>
    );
}

interface EditableDateFieldProps {
    label: string;
    value: string; // ISO
    onChange: (value: string) => void; // ISO
    required?: boolean;
}

export function EditableDateField({label, value, onChange, required}: EditableDateFieldProps) {
    const displayValue = value ? formatDate(value) : "";

    return (
        <div className="min-w-0">
            <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                {label} {required && <span className="text-[#c0392b]">*</span>}
            </span>
            <DatePickerInput
                modal
                modalTitle={label}
                value={displayValue}
                onChange={(display) => onChange(parseDDMMYYYYToISO(display))}
                className="min-w-0"
            />
        </div>
    );
}

interface EditableCheckboxFieldProps {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

export function EditableCheckboxField({label, checked, onChange, disabled}: EditableCheckboxFieldProps) {
    return (
        <div className="min-w-0">
            <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">{label}</span>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`w-full h-10 px-3 rounded-[9px] border box-border flex items-center gap-2 text-[13px] ${
                    disabled
                        ? "border-[#eef2f7] bg-[#f6f8fb] text-[#c3ccd8] cursor-default"
                        : "border-[#e5e9f0] bg-white text-[#1c2740] cursor-pointer hover:bg-[#f6f8fb]"
                }`}
            >
                <span
                    className={`w-4 h-4 flex-none rounded-[5px] border-[1.5px] grid place-items-center ${
                        checked && !disabled ? "border-[#4e57d6] bg-[#4e57d6]" : "border-[#cbd3df] bg-white"
                    }`}
                >
                    {checked && !disabled && <span className="w-[8px] h-[8px] rounded-[2px] bg-white"/>}
                </span>
                {checked ? "Да" : "Нет"}
            </button>
        </div>
    );
}

interface EditableTextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
    rows?: number;
}

export function EditableTextAreaField({
                                          label,
                                          value,
                                          onChange,
                                          placeholder,
                                          required,
                                          rows = 3,
                                      }: EditableTextAreaFieldProps) {
    return (
        <div className="min-w-0">
            <span className="block text-[11.5px] text-[#8b97ab] mb-[5px]">
                {label} {required && <span className="text-[#c0392b]">*</span>}
            </span>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full min-w-0 px-3 py-2.5 rounded-[9px] border border-[#e5e9f0] bg-white outline-none text-[13px] text-[#1c2740] box-border resize-y focus:border-[#4e57d6] focus:ring-[3px] focus:ring-[#ececfc]"
            />
        </div>
    );
}