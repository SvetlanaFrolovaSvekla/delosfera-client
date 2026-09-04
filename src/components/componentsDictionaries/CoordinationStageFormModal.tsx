// Модалка добавления/редактирования обязательного (фиксированного) этапа согласования:
// название этапа, СП (структурное подразделение) и согласующий по умолчанию из этого СП.
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useModalShake} from "@/hooks/useModalShake.ts";

import {ChevronDown, Search, X} from "lucide-react";
import type {
    CoordinationDefaultApproverResponse
} from "@/service/dictionariesService/coordinationDefaultApproverService/coordinationDefaultApproverServiceType.ts";
import type {CoordinationStageFormValues} from "@/hooks/dictionariesHooks/useCoordinationApprovers.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {
    VndSelectApproverModal, type ApproverOption
} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/VndSelectApproverModal.tsx";

const EMPTY_EXCLUDED = new Set<number>();

interface CoordinationStageFormModalProps {
    open: boolean;
    onClose: () => void;
    mode: "create" | "edit";
    item: CoordinationDefaultApproverResponse | null; // заполнено только в режиме edit
    submitting: boolean;
    error: string | null;
    onSubmit: (values: CoordinationStageFormValues) => void;
}

export function CoordinationStageFormModal({
                                                open,
                                                onClose,
                                                mode,
                                                item,
                                                submitting,
                                                error,
                                                onSubmit,
                                            }: CoordinationStageFormModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();
    const {orgUnits} = useDictionaries();

    const [title, setTitle] = useState("");
    const [orgUnitId, setOrgUnitId] = useState<number | null>(null);
    const [approverUserId, setApproverUserId] = useState<number | null>(null);
    const [approverName, setApproverName] = useState<string | null>(null);
    const [orgUnitQuery, setOrgUnitQuery] = useState("");
    const [approverPickerOpen, setApproverPickerOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle(item?.title ?? "");
        setOrgUnitId(item?.orgUnitId ?? null);
        setApproverUserId(item?.approverUserId ?? null);
        setApproverName(item?.approverName ?? null);
        setOrgUnitQuery("");
    }, [open, item]);

    const filteredOrgUnits = useMemo(() => {
        const lower = orgUnitQuery.trim().toLowerCase();
        if (!lower) return orgUnits;
        return orgUnits.filter((o) => o.titleRu.toLowerCase().includes(lower));
    }, [orgUnits, orgUnitQuery]);

    const selectedOrgUnit = orgUnits.find((o) => o.id === orgUnitId) ?? null;

    if (!open) return null;

    const canSubmit = title.trim().length > 0 && orgUnitId !== null && !submitting;

    // Смена СП вручную - ранее выбранный согласующий из старого СП больше не подходит,
    // список согласующих в пикере теперь тоже другой (фильтруется по СП на бэкенде через
    // /users/approvers + lockedOrgUnitId), так что сбрасываем выбор.
    const handlePickOrgUnit = (id: number) => {
        setOrgUnitId(id);
        setOrgUnitQuery("");
        setApproverUserId(null);
        setApproverName(null);
    };

    const handleClearApprover = () => {
        setApproverUserId(null);
        setApproverName(null);
    };

    const handleSelectApprover = (user: ApproverOption) => {
        setApproverUserId(user.id);
        setApproverName(user.fullName);
    };

    const handleSubmit = () => {
        if (!canSubmit || orgUnitId === null) return;
        onSubmit({
            title: title.trim(),
            orgUnitId,
            approverUserId,
        });
    };

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[480px] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7]">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                        {mode === "create" ? "Новый обязательный этап" : "Изменить обязательный этап"}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3.5">
                    <div>
                        <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                            Название этапа <span className="text-[#c0392b]">*</span>
                        </span>
                        <input
                            autoFocus
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Например: Служба экономической безопасности"
                            className="w-full h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                        />
                    </div>

                    <div>
                        <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                            Подразделение (СП) <span className="text-[#c0392b]">*</span>
                        </span>
                        <div className="border border-[#e5e9f0] rounded-[9px] overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#eef2f7]">
                                <Search className="w-[14px] h-[14px] text-[#a3adbd] flex-none" strokeWidth={2}/>
                                <input
                                    value={orgUnitQuery}
                                    onChange={(e) => setOrgUnitQuery(e.target.value)}
                                    placeholder={selectedOrgUnit ? selectedOrgUnit.titleRu : t("general.search")}
                                    className="flex-1 min-w-0 text-[13px] outline-none"
                                />
                            </div>
                            <div className="max-h-[180px] overflow-y-auto py-1">
                                {filteredOrgUnits.length === 0 && (
                                    <div className="px-3 py-2 text-[12.5px] text-[#8b97ab]">{t("general.notFound")}</div>
                                )}
                                {filteredOrgUnits.map((o) => (
                                    <button
                                        key={o.id}
                                        type="button"
                                        onClick={() => handlePickOrgUnit(o.id)}
                                        className={
                                            orgUnitId === o.id
                                                ? "w-full flex items-center gap-2.5 px-3 py-2 text-left bg-[#eef0fd] cursor-pointer"
                                                : "w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#f6f8fb] cursor-pointer"
                                        }
                                    >
                                        <span className="text-[13px] text-[#1c2740] truncate">{o.titleRu}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                            Согласующий по умолчанию
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={orgUnitId === null}
                                onClick={() => setApproverPickerOpen(true)}
                                className="flex h-9 flex-1 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-3 text-left text-[13px] outline-none hover:border-[#4e57d6]/50 focus:border-[#4e57d6] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {approverName ? (
                                    <span className="truncate text-[#1c2740]">{approverName}</span>
                                ) : (
                                    <span className="text-[#a3adbd]">
                                        {orgUnitId === null ? "Сначала выберите СП" : "Выбрать согласующего…"}
                                    </span>
                                )}
                                <ChevronDown size={14} className="flex-none text-[#8b97ab]"/>
                            </button>

                            {approverName && (
                                <button
                                    type="button"
                                    onClick={handleClearApprover}
                                    className="h-9 w-9 flex-none grid place-items-center rounded-[9px] border border-[#e5e9f0] bg-white text-[#8b97ab] cursor-pointer hover:bg-[#fdeceb] hover:text-[#c0392b]"
                                    title="Сбросить согласующего"
                                >
                                    <X className="w-[14px] h-[14px]" strokeWidth={2}/>
                                </button>
                            )}
                        </div>
                        <p className="mt-1.5 text-[11.5px] text-[#a3adbd]">
                            В списке — только сотрудники выбранного подразделения с правом быть согласующим.
                        </p>
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
                        disabled={!canSubmit}
                        className="h-9 px-5 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {submitting ? t("general.saving") : t("general.save")}
                    </button>
                </div>
            </div>

            {approverPickerOpen && orgUnitId !== null && (
                <VndSelectApproverModal
                    lockedOrgUnitId={orgUnitId}
                    lockedOrgUnitLabel={selectedOrgUnit?.titleRu}
                    excludedUserIds={EMPTY_EXCLUDED}
                    onClose={() => setApproverPickerOpen(false)}
                    onSelect={handleSelectApprover}
                />
            )}
        </div>
    );
}
