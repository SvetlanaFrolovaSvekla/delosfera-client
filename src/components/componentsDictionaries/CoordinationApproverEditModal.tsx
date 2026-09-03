// Модалка выбора согласующего по умолчанию для одного из фиксированных этапов маршрута
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useModalShake} from "@/hooks/useModalShake.ts";

import {Search, X} from "lucide-react";
import type {
    CoordinationDefaultApproverResponse
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverServiceType.ts";
import {useUserOptions} from "@/hooks/useUserOptions.ts";

interface CoordinationApproverEditModalProps {
    open: boolean;
    onClose: () => void;
    item: CoordinationDefaultApproverResponse;
    submitting: boolean;
    error: string | null;
    onSubmit: (approverUserId: number | null) => void;
}

export function CoordinationApproverEditModal({
                                                  open,
                                                  onClose,
                                                  item,
                                                  submitting,
                                                  error,
                                                  onSubmit,
                                              }: CoordinationApproverEditModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();
    const {options, loading: optionsLoading} = useUserOptions();

    const [selectedKey, setSelectedKey] = useState<string | null>(
        item.approverUserId != null ? String(item.approverUserId) : null
    );
    const [query, setQuery] = useState("");

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (open) setSelectedKey(item.approverUserId != null ? String(item.approverUserId) : null);
    }, [open, item.approverUserId]);

    const filteredOptions = useMemo(() => {
        const lower = query.trim().toLowerCase();
        if (!lower) return options;
        return options.filter((o) => o.label.toLowerCase().includes(lower));
    }, [options, query]);

    if (!open) return null;

    const handleSubmit = () => {
        onSubmit(selectedKey != null ? Number(selectedKey) : null);
    };

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7]">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                        {/* УСТАРЕЛО: этот компонент больше не используется (заменён на
                            CoordinationStageFormModal.tsx), оставлен только чтобы не ломать
                            сборку - item.kindTitle раньше отдавал бэк, теперь у записи
                            справочника просто есть Title. */}
                        {t("coordinationApproversPage.formTitle", {kind: item.title})}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3.5">
                    <div className="px-3 py-2 rounded-[9px] bg-[#f6f8fb] text-[12px] text-[#8b97ab]">
                        {/* Подразделение: {orgUnitName} */}
                        {t("coordinationApproversPage.orgUnitHint", {orgUnitName: item.orgUnitName})}
                    </div>

                    <div>
                        <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                            {t("coordinationApproversPage.fieldApprover")}
                        </span>

                        <div className="border border-[#e5e9f0] rounded-[9px] overflow-hidden">
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

                            <div className="max-h-[240px] overflow-y-auto py-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedKey(null)}
                                    className={
                                        selectedKey === null
                                            ? "w-full flex items-center gap-2.5 px-3 py-2 text-left bg-[#eef0fd] cursor-pointer"
                                            : "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#f6f8fb] cursor-pointer"
                                    }
                                >
                                    <span className="text-[13px] text-[#8b97ab] italic">
                                        {/* — Не назначен — */}
                                        {t("coordinationApproversPage.noApprover")}
                                    </span>
                                </button>

                                {optionsLoading && (
                                    <div className="px-3 py-2 text-[12.5px] text-[#8b97ab]">{t("general.loading")}</div>
                                )}

                                {!optionsLoading && filteredOptions.length === 0 && (
                                    <div className="px-3 py-2 text-[12.5px] text-[#8b97ab]">{t("general.notFound")}</div>
                                )}

                                {!optionsLoading && filteredOptions.map((o) => (
                                    <button
                                        key={o.key}
                                        type="button"
                                        onClick={() => setSelectedKey(o.key)}
                                        className={
                                            selectedKey === o.key
                                                ? "w-full flex items-center gap-2.5 px-3 py-2 text-left bg-[#eef0fd] cursor-pointer"
                                                : "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#f6f8fb] cursor-pointer"
                                        }
                                    >
                                        <span className="text-[13px] text-[#1c2740] truncate">{o.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="px-3 py-2 rounded-[9px] bg-[#fdeceb] text-[#c0392b] text-[12.5px]">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[#eef2f7]">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {t("general.cancel")}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="h-9 px-5 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {submitting ? t("general.saving") : t("general.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}