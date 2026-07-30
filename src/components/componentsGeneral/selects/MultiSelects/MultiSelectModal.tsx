import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {Check, X} from "lucide-react";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";

export interface MultiSelectModalOption {
    key: string;
    label: string;
}

interface MultiSelectModalProps {
    open: boolean;
    onClose: () => void;

    title: string;
    options: MultiSelectModalOption[];
    selectedKeys: string[];
    onApply: (keys: string[]) => void;

    searchPlaceholder?: string;
    selectedCountLabel?: string; // например "Выбрано видов"
}

export function MultiSelectModal({
                                     open,
                                     onClose,
                                     title,
                                     options,
                                     selectedKeys,
                                     onApply,
                                     searchPlaceholder,
                                     selectedCountLabel,
                                 }: MultiSelectModalProps) {
    const {t} = useTranslation();
    const [draft, setDraft] = useState<string[]>(selectedKeys);
    const [query, setQuery] = useState("");
    const [prevOpen, setPrevOpen] = useState(open);
    const panelRef = useRef<HTMLDivElement>(null);

    // Сброс черновика при каждом открытии модалки — обновление state во время рендера
    // (рекомендованный React-паттерн вместо useEffect + setState)
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setDraft(selectedKeys);
            setQuery("");
        }
    }

    if (!open) return null;

    const filteredOptions = query.trim()
        ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
        : options;

    const toggle = (key: string) =>
        setDraft((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );

    const allSelected = options.length > 0 && draft.length === options.length;
    const noneSelected = draft.length === 0;

    const selectAll = () => setDraft(options.map((o) => o.key));
    const deselectAll = () => setDraft([]);

    const handleApply = () => {
        onApply(draft);
        onClose();
    };

    const handleBackdropClick = () => {
        // Клик вне модалки не закрывает её — лёгкая тряска панели как подсказка
        panelRef.current?.animate(
            [
                {transform: "translateX(0)"},
                {transform: "translateX(-3px)"},
                {transform: "translateX(3px)"},
                {transform: "translateX(-2px)"},
                {transform: "translateX(2px)"},
                {transform: "translateX(0)"},
            ],
            {duration: 220, easing: "ease-in-out"}
        );
    };

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden flex flex-col"
            >
                {/* Заголовок */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7] flex-none">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                {/* Фильтр — сверху, через SearchBar */}
                <div className="px-5 pt-4 pb-2 flex-none">
                    <SearchBar
                        variant="gray"
                        value={query}
                        onChange={setQuery}
                        placeholder={searchPlaceholder ?? t("general.search")}
                    />
                </div>

                {/* Все / снять все */}
                <div className="flex items-center justify-between px-5 pb-2 flex-none">
                    <button
                        type="button"
                        onClick={selectAll}
                        disabled={allSelected}
                        className={`text-[11px] font-semibold cursor-pointer ${
                            allSelected
                                ? "text-[#c3ccd8] cursor-default"
                                : "text-[#4e57d6] hover:underline"
                        }`}
                    >
                        {t("general.selectAll")}
                    </button>
                    <button
                        type="button"
                        onClick={deselectAll}
                        disabled={noneSelected}
                        className={`text-[11px] font-semibold cursor-pointer ${
                            noneSelected
                                ? "text-[#c3ccd8] cursor-default"
                                : "text-[#4e57d6] hover:underline"
                        }`}
                    >
                        {t("general.deselectAll")}
                    </button>
                </div>

                {/* Список — фиксированная область, не влияет на размер окна */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredOptions.length === 0 && (
                        <div className="px-3 py-8 text-center text-[13px] text-[#a3adbd]">
                            {t("general.notFound")}
                        </div>
                    )}
                    {filteredOptions.map((o) => {
                        const on = draft.includes(o.key);
                        return (
                            <button
                                key={o.key}
                                type="button"
                                onClick={() => toggle(o.key)}
                                className="w-full flex items-center gap-[11px] px-2.5 py-[10px] rounded-lg bg-transparent text-left cursor-pointer hover:bg-[#f6f8fb]"
                            >
                                <span
                                    className={`w-5 h-5 flex-none rounded-md grid place-items-center ${
                                        on
                                            ? "border-[1.5px] border-[#4e57d6] bg-[#4e57d6]"
                                            : "border-[1.5px] border-[#cbd3df] bg-white"
                                    }`}
                                >
                                    <Check
                                        className="w-[13px] h-[13px] text-white"
                                        strokeWidth={3}
                                        style={{opacity: on ? 1 : 0}}
                                    />
                                </span>
                                <span className="text-[13.5px] text-[#26324a]">
                                    <HighlightText text={o.label} query={query}/>
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Кнопки */}
                <div className="flex items-center justify-between gap-2.5 px-5 py-4 border-t border-[#eef2f7] flex-none">
                    <span className="text-[12px] text-[#8b97ab]">
                        {(selectedCountLabel ?? t("general.selectedCount"))}{" "}
                        <b className="text-[#3a4560] font-mono">{draft.length}</b>
                    </span>
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onClose}
                            className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]"
                        >
                            {t("general.cancel")}
                        </button>
                        <button
                            onClick={handleApply}
                            className="h-9 px-5 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06]"
                        >
                            {t("general.save")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}