import {useNavigate} from "react-router-dom";
import type {VndQuickSearchResult} from "@/service/vndService/vndServiceType.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {HighlightText} from "@/utils/HighlightText.tsx";

interface HeaderSearchResultsProps {
    results: VndQuickSearchResult[];
    loading: boolean;
    query: string;
    onSelect: () => void;
}

export function HeaderSearchResults({results, loading, query, onSelect}: HeaderSearchResultsProps) {
    const navigate = useNavigate();

    return (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-white border border-[#e5e9f0] rounded-xl shadow-lg z-50 overflow-hidden">
            {loading ? (
                <div className="px-4 py-3 text-[12.5px] text-[#8b97ab]">Поиск…</div>
            ) : results.length === 0 ? (
                <div className="px-4 py-3 text-[12.5px] text-[#8b97ab]">Ничего не найдено по «{query}»</div>
            ) : (
                <ul className="max-h-[420px] overflow-y-auto py-1.5">
                    {results.map((r) => {
                        const meta = STATUS_META[r.status];
                        const StatusIcon = meta.icon;

                        return (
                            <li key={r.id}>
                                <button
                                    onClick={() => {
                                        navigate(`/base-vnd/${r.id}`);
                                        onSelect();
                                    }}
                                    className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-[#f6f8fb] text-left cursor-pointer"
                                >
                                    <span
                                        className="w-7 h-7 flex-none rounded-lg grid place-items-center mt-px"
                                        style={{background: meta.bg, color: meta.color}}
                                        title={meta.label}
                                    >
                                        <StatusIcon className="w-[15px] h-[15px]" strokeWidth={2}/>
                                    </span>
                                    <span className="flex-1 min-w-0 block text-[12.5px] font-medium text-[#1c2740] whitespace-normal break-words">
                                        <span className="font-mono font-semibold text-[#4e57d6]">
                                            ВНД <HighlightText text={r.code} query={query}/>
                                        </span>
                                        {" — "}
                                        <HighlightText text={r.name} query={query}/>
                                    </span>
                                    <span
                                        className="flex-none inline-flex items-center text-[11px] font-semibold py-0.5 px-[9px] rounded-full whitespace-nowrap mt-px"
                                        style={{color: meta.color, background: meta.bg}}
                                    >
                                        {meta.label}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}