// Мультиселект пользователей с поиском - для форм типа "группа пользователей"
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronDown, Search, X} from "lucide-react";

interface DictOption {
    key: string;
    label: string;
}

interface UserMultiSelectFieldProps {
    label: string;
    options: DictOption[];
    optionsLoading: boolean;
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
}

export function UserMultiSelectField({
                                         label,
                                         options,
                                         optionsLoading,
                                         selectedKeys,
                                         onChange,
                                     }: UserMultiSelectFieldProps) {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const selectedOptions = useMemo(
        () => options.filter((o) => selectedKeys.includes(o.key)),
        [options, selectedKeys]
    );

    const filteredOptions = useMemo(() => {
        const lower = query.trim().toLowerCase();
        if (!lower) return options;
        return options.filter((o) => o.label.toLowerCase().includes(lower));
    }, [options, query]);

    const toggleOption = (key: string) => {
        if (selectedKeys.includes(key)) {
            onChange(selectedKeys.filter((x) => x !== key));
        } else {
            onChange([...selectedKeys, key]);
        }
    };

    const removeOption = (key: string) => {
        onChange(selectedKeys.filter((x) => x !== key));
    };

    return (
        <div>
            <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">{label}</span>

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full min-h-9 px-3 py-1.5 rounded-[9px] border border-[#e5e9f0] bg-white text-left text-[13px] text-[#1c2740] flex items-center justify-between gap-2 cursor-pointer hover:border-[#c7cfdc]"
            >
                <span className="flex-1 min-w-0 truncate text-[#8b97ab]">
                    {selectedOptions.length === 0
                        ? t("general.openList")
                        : `${t("general.selectedCount")} ${selectedOptions.length}`}
                </span>
                <ChevronDown className={`w-4 h-4 flex-none text-[#a3adbd] transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2}/>
            </button>

            {selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedOptions.map((o) => (
                        <span
                            key={o.key}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#eef0fd] text-[#4e57d6] text-[12px] font-medium"
                        >
                            {o.label}
                            <button
                                type="button"
                                onClick={() => removeOption(o.key)}
                                className="w-3.5 h-3.5 grid place-items-center rounded-full hover:bg-[#dcdefa] cursor-pointer"
                            >
                                <X className="w-[10px] h-[10px]" strokeWidth={2.5}/>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {open && (
                <div className="mt-2 border border-[#e5e9f0] rounded-[9px] bg-white shadow-[0_10px_24px_-12px_rgba(15,27,45,.25)] overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-[#eef2f7]">
                        <Search className="w-[14px] h-[14px] text-[#a3adbd] flex-none" strokeWidth={2}/>
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("general.search")}
                            className="flex-1 min-w-0 text-[13px] outline-none"
                        />
                    </div>

                    <div className="max-h-[220px] overflow-y-auto py-1">
                        {optionsLoading && (
                            <div className="px-3 py-2 text-[12.5px] text-[#8b97ab]">{t("general.loading")}</div>
                        )}

                        {!optionsLoading && filteredOptions.length === 0 && (
                            <div className="px-3 py-2 text-[12.5px] text-[#8b97ab]">{t("general.notFound")}</div>
                        )}

                        {!optionsLoading && filteredOptions.map((o) => {
                            const checked = selectedKeys.includes(o.key);
                            return (
                                <button
                                    key={o.key}
                                    type="button"
                                    onClick={() => toggleOption(o.key)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#f6f8fb] cursor-pointer"
                                >
                                    <span
                                        className={
                                            checked
                                                ? "w-4 h-4 flex-none rounded-[4px] bg-[#4e57d6] grid place-items-center"
                                                : "w-4 h-4 flex-none rounded-[4px] border border-[#c7cfdc]"
                                        }
                                    >
                                        {checked && <span className="w-1.5 h-1.5 bg-white rounded-[1px]"/>}
                                    </span>
                                    <span className="flex-1 min-w-0 text-[13px] text-[#1c2740] truncate">
                                        {o.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}