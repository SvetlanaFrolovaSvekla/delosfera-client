import {useState} from "react";
import {ChevronRight, Link2, Loader2, Plus, X} from "lucide-react";
import type {VndLinkItem, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {useVndLinks} from "@/hooks/vndHooks/useVndLinks.ts";
import {VndLinkPicker} from "@/components/componentsVND/componentsOpenVndPage/componentsLinks/VndLinkPicker.tsx";

interface VndLinksTabProps {
    vndId: number;
}

const STATUS_LABELS: Record<string, string> = {
    active: "Действующий",
    onact: "На актуализации",
    review: "На согласовании",
    consol: "На консолидации",
    arch: "В архиве",
    draft: "Черновик",
};

const STATUS_STYLES: Record<string, string> = {
    active: "text-emerald-700 bg-emerald-100",
    onact: "text-amber-700 bg-amber-100",
    review: "text-indigo-700 bg-indigo-100",
    consol: "text-sky-700 bg-sky-100",
    arch: "text-slate-500 bg-slate-100",
    draft: "text-slate-400 bg-slate-100",
};

type SubTab = "outgoing" | "incoming";

export function VndLinksTab({vndId}: VndLinksTabProps) {
    const [subTab, setSubTab] = useState<SubTab>("outgoing");
    const [pickerOpen, setPickerOpen] = useState(false);

    const {data, isLoading, isMutating, addLink, deleteLink} = useVndLinks(vndId);

    const list = subTab === "outgoing" ? data?.outgoing ?? [] : data?.incoming ?? [];

    const handleSelect = async (item: VndResponse) => {
        await addLink(item.id);
        setPickerOpen(false);
    };

    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex items-center gap-3">
                <Link2 size={18} strokeWidth={1.8} className="text-[#4e57d6]"/>
                <h2 className="m-0 text-sm font-semibold flex-1">Связанные документы</h2>
                {subTab === "outgoing" && (
                    <button
                        onClick={() => setPickerOpen(true)}
                        className="flex items-center gap-1.5 cursor-pointer text-xs font-medium bg-[var(--app-accent,_#2f68f5)] font-semibold text-white hover:brightness-[1.06] rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                        <Plus size={14} strokeWidth={2}/>
                        Добавить ссылку
                    </button>
                )}
            </div>

            <div className="flex gap-1 px-5 pt-3">
                <button
                    onClick={() => setSubTab("outgoing")}
                    className={`cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        subTab === "outgoing" ? "bg-indigo-50 text-[#4e57d6]" : "text-[#8b97ab] hover:bg-slate-50"
                    }`}
                >
                    Ссылки на документы {data ? `(${data.outgoing.length})` : ""}
                </button>
                <button
                    onClick={() => setSubTab("incoming")}
                    className={`cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        subTab === "incoming" ? "bg-indigo-50 text-[#4e57d6]" : "text-[#8b97ab] hover:bg-slate-50"
                    }`}
                >
                    Ссылающиеся документы {data ? `(${data.incoming.length})` : ""}
                </button>
            </div>

            <div className="px-2 pb-2 mt-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10 text-[#8b97ab]">
                        <Loader2 size={18} className="animate-spin"/>
                    </div>
                ) : list.length === 0 ? (
                    <div className="text-center py-10 text-[13px] text-[#8b97ab]">
                        {subTab === "outgoing" ? "Ссылок на другие документы пока нет" : "Никто ещё не ссылается на этот документ"}
                    </div>
                ) : (
                    list.map((item) => (
                        <LinkRow
                            key={item.id}
                            item={item}
                            canDelete={subTab === "outgoing"}
                            disabled={isMutating}
                            onDelete={() => deleteLink(item.id)}
                        />
                    ))
                )}
            </div>

            {pickerOpen && (
                <VndLinkPicker
                    excludeIds={[vndId, ...list.map((l) => l.vndId)]}
                    onSelect={handleSelect}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}

function LinkRow({
                     item,
                     canDelete,
                     disabled,
                     onDelete,
                 }: {
    item: VndLinkItem;
    canDelete: boolean;
    disabled: boolean;
    onDelete: () => void;
}) {
    return (
        <div className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
      <span
          className="w-9 h-9 flex-none rounded-[9px] bg-[#f2f5f9] text-[#55617a] grid place-items-center font-mono text-[10px] font-semibold">
        {item.code.slice(0, 3)}
      </span>
            <a href={`/basevnd/${item.vndId}`} className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11.5px] font-semibold text-[#4e57d6]">{item.code}</span>
          <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_STYLES[item.status] ?? "text-slate-500 bg-slate-100"}`}>
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
        </span>
                <span className="block text-[12.5px] text-[#55617a] mt-0.5 truncate">{item.title}</span>
            </a>
            {canDelete && (
                <button
                    onClick={onDelete}
                    disabled={disabled}
                    className="opacity-0 group-hover:opacity-100 flex-none text-[#c3ccd8] hover:text-red-500 transition-all disabled:opacity-40"
                    title="Удалить ссылку"
                >
                    <X size={16} strokeWidth={2}/>
                </button>
            )}
            <ChevronRight size={16} strokeWidth={2} className="flex-none text-[#c3ccd8]"/>
        </div>
    );
}