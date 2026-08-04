import { useEffect, useRef, useState } from "react";
import { ChevronDown, Link2, Loader2, SlidersHorizontal, X } from "lucide-react";
import { vndService } from "@/service/vndService/vndService.ts";
import type { VndResponse } from "@/service/vndService/vndServiceType.ts";
import { useDictionaries } from "@/context/DictionariesContext.tsx";
import { MultiSelectField } from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import { SearchBar } from "@/components/componentsGeneral/SearchBar.tsx";
import {HighlightText} from "@/utils/HighlightText.tsx";

interface VndLinkPickerProps {
    excludeIds: number[];
    onSelect: (item: VndResponse) => void;
    onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
    active: "Действующий",
};

export function VndLinkPicker({ excludeIds, onSelect, onClose }: VndLinkPickerProps) {
    const dictionaries = useDictionaries();

    const [query, setQuery] = useState("");
    const [advOpen, setAdvOpen] = useState(false);

    const [codeFilter, setCodeFilter] = useState("");
    const [revisionTextFilter, setRevisionTextFilter] = useState("");
    const [docTypeFilters, setDocTypeFilters] = useState<string[]>([]);
    const [rubricFilters, setRubricFilters] = useState<string[]>([]);
    const [developerFilters, setDeveloperFilters] = useState<string[]>([]);
    const [keywordFilters, setKeywordFilters] = useState<string[]>([]);

    const [results, setResults] = useState<VndResponse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const requestIdRef = useRef(0);

    const hasAdvFilters =
        codeFilter.trim() !== "" ||
        revisionTextFilter.trim() !== "" ||
        docTypeFilters.length > 0 ||
        rubricFilters.length > 0 ||
        developerFilters.length > 0 ||
        keywordFilters.length > 0;

    useEffect(() => {
        const currentRequestId = ++requestIdRef.current;
        setIsLoading(true);

        const timeoutId = setTimeout(async () => {
            try {
                const response = await vndService.search({
                    name: query.trim() || undefined,
                    code: codeFilter.trim() || undefined,
                    revisionText: revisionTextFilter.trim() || undefined,
                    typeIds: docTypeFilters.map(Number),
                    rubricIds: rubricFilters.map(Number),
                    developerIds: developerFilters.map(Number),
                    keywordIds: keywordFilters.map(Number),
                    statuses: ["active"],
                });
                if (requestIdRef.current === currentRequestId) {
                    setResults(response.filter((item) => !excludeIds.includes(item.id)));
                    setHasSearched(true);
                }
            } finally {
                if (requestIdRef.current === currentRequestId) setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, codeFilter, revisionTextFilter, docTypeFilters, rubricFilters, developerFilters, keywordFilters, excludeIds]);

    const handleResetAdv = () => {
        setCodeFilter("");
        setRevisionTextFilter("");
        setDocTypeFilters([]);
        setRubricFilters([]);
        setDeveloperFilters([]);
        setKeywordFilters([]);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-20" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-[1600px] shadow-xl overflow-hidden flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Заголовок */}
                <div className="flex items-center gap-2.5 px-5 pt-4 pb-3 border-b border-[#eef2f7]">
                    <Link2 size={17} strokeWidth={1.8} className="text-[#4e57d6]" />
                    <h2 className="m-0 text-[13.5px] font-semibold flex-1">Добавить ссылку на ВНД</h2>
                    <button onClick={onClose} className="flex-none text-[#c3ccd8] hover:text-[#55617a] cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Поиск */}
                <div className="px-5 pt-3.5 pb-3 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2.5">
                        <SearchBar
                            variant="white"
                            value={query}
                            onChange={setQuery}
                            placeholder="Поиск по коду или наименованию…"
                            className="flex-1"
                        />
                        <button
                            onClick={() => setAdvOpen((v) => !v)}
                            className={`inline-flex items-center gap-1.5 h-9 px-3 flex-none rounded-[9px] border text-[#3a4560] font-semibold text-[12px] cursor-pointer hover:bg-[#f6f8fb] ${
                                advOpen || hasAdvFilters
                                    ? "border-[#4e57d6] ring-[3px] ring-[#ececfc] bg-[#f6f8fb]"
                                    : "border-[#e5e9f0] bg-white"
                            }`}
                        >
                            <SlidersHorizontal size={14} strokeWidth={1.8} />
                            Ещё
                            <ChevronDown
                                size={14}
                                strokeWidth={2}
                                className={`flex-none text-[#a3adbd] transition-transform ${advOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                    </div>

                    <div
                        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
                            advOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                    >
                        <div className="overflow-hidden">
                            <div className="border border-[#eef2f7] rounded-xl p-3.5 flex flex-col gap-2.5">
                                <div className="grid grid-cols-2 gap-2.5">
                                    <label>
                                        <span className="block text-[11px] text-[#8b97ab] mb-[5px]">Код документа</span>
                                        <SearchBar
                                            variant="white"
                                            value={codeFilter}
                                            onChange={setCodeFilter}
                                            placeholder="Поиск по коду…"
                                        />
                                    </label>
                                    <label>
                                        <span className="block text-[11px] text-[#8b97ab] mb-[5px]">Текст редакции</span>
                                        <SearchBar
                                            variant="white"
                                            value={revisionTextFilter}
                                            onChange={setRevisionTextFilter}
                                            placeholder="Поиск по тексту…"
                                        />
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    <MultiSelectField
                                        label="Вид документа"
                                        modalTitle="Вид документа"
                                        options={dictionaries.typeOptions}
                                        selectedKeys={docTypeFilters}
                                        onChange={setDocTypeFilters}
                                        searchPlaceholder="Поиск вида…"
                                    />
                                    <MultiSelectField
                                        label="Разработчик"
                                        modalTitle="Разработчик (СП)"
                                        options={dictionaries.orgUnitOptions}
                                        selectedKeys={developerFilters}
                                        onChange={setDeveloperFilters}
                                        searchPlaceholder="Поиск подразделения…"
                                        hierarchical
                                    />
                                    <MultiSelectField
                                        label="Рубрикатор"
                                        modalTitle="Рубрикатор"
                                        options={dictionaries.rubricOptions}
                                        selectedKeys={rubricFilters}
                                        onChange={setRubricFilters}
                                        searchPlaceholder="Поиск рубрики…"
                                        hierarchical
                                    />
                                    <MultiSelectField
                                        label="Ключевые слова"
                                        modalTitle="Ключевые слова"
                                        options={dictionaries.keywordOptions}
                                        selectedKeys={keywordFilters}
                                        onChange={setKeywordFilters}
                                        searchPlaceholder="Поиск ключевых слов…"
                                        hierarchical
                                    />
                                </div>

                                {hasAdvFilters && (
                                    <button
                                        onClick={handleResetAdv}
                                        className="self-end text-[11.5px] font-semibold text-[#8b97ab] hover:text-[#55617a] cursor-pointer"
                                    >
                                        Сбросить доп. фильтры
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Результаты */}
                <div className="flex-1 overflow-y-auto px-2 pb-2 border-t border-[#eef2f7]">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-10 text-[#8b97ab]">
                            <Loader2 size={18} className="animate-spin" />
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-10 text-[13px] text-[#8b97ab]">
                            {hasSearched ? "Действующие ВНД не найдены" : "Начните поиск…"}
                        </div>
                    ) : (
                        results.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSelect(item)}
                                className="w-full flex items-start gap-3 px-3 py-2.5 mt-1 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                <span className="w-9 h-9 flex-none rounded-[9px] bg-[#f2f5f9] text-[#55617a] grid place-items-center font-mono text-[10px] font-semibold mt-0.5">
                                    {item.code.slice(0, 3)}
                                </span>
                                <span className="flex-1 min-w-0">
                                    <span className="flex items-center gap-2">
                                        <span className="font-mono text-[11.5px] font-semibold text-[#4e57d6]">
                                            <HighlightText text={item.code} query={query || codeFilter} />
                                        </span>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-100">
                                            {STATUS_LABELS[item.status] ?? item.status}
                                        </span>
                                    </span>
                                    <span className="block text-[12.5px] text-[#55617a] mt-0.5 truncate">
                                        <HighlightText text={item.name} query={query} />
                                    </span>
                                    <span className="block text-[11px] text-[#a3adbd] mt-0.5 truncate">
                                        {item.typeName} · {item.organName}
                                    </span>
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}