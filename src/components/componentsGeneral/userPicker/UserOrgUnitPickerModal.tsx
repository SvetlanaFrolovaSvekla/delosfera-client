// Модалка выбора одного пользователя: список с иерархическим фильтром по СП и поиском
// по ФИО. Копия того же каркаса, что и в "Выбор согласующего" (VndSelectApproverModal) —
// тот же UserPickerModalShell, тот же хук useOrgUnitFilter и тот же фильтр по СП, чтобы
// в разных местах системы пикер пользователя не расходился по виду и поведению.
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useOrgUnitFilter} from "@/hooks/vndHooks/useOrgUnitFilter.ts";
import {OrgUnitMultiSelectFilter} from "@/components/componentsGeneral/selects/OrgUnitMultiSelectFilter.tsx";
import {
    UserPickerModalShell,
    UserPickerSearchInput,
    UserPickerListStatus,
} from "@/components/componentsGeneral/userPicker/UserPickerModalShell.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
import {User as UserIcon} from "lucide-react";

export interface OrgUnitPickerPerson {
    id: number;
    fullName: string;
    position?: string | null;
    orgUnit?: string | null;
    orgUnitId?: number | null;
}

interface UserOrgUnitPickerModalProps {
    people: OrgUnitPickerPerson[];
    /** Не показывать в списке — например, уже выбранного в другом поле формы. */
    excludeId?: number;
    /** Подсветить текущий выбор в списке. */
    selectedId?: number;
    title: string;
    searchPlaceholder: string;
    onSelect: (person: OrgUnitPickerPerson) => void;
    onClose: () => void;
}

export function UserOrgUnitPickerModal({
                                            people,
                                            excludeId,
                                            selectedId,
                                            title,
                                            searchPlaceholder,
                                            onSelect,
                                            onClose,
                                        }: UserOrgUnitPickerModalProps) {
    const {t} = useTranslation();
    const [search, setSearch] = useState("");

    const {treeOptions, selectedKeys, setSelectedKeys, selectedIds, loading, error} = useOrgUnitFilter();

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return people
            .filter((p) => p.id !== excludeId)
            .filter((p) => selectedIds.size === 0 || (p.orgUnitId !== null && p.orgUnitId !== undefined && selectedIds.has(p.orgUnitId)))
            .filter((p) =>
                term === ""
                    ? true
                    : `${p.fullName} ${p.position ?? ""} ${p.orgUnit ?? ""}`.toLowerCase().includes(term),
            )
            .sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
    }, [people, excludeId, search, selectedIds]);

    const handlePick = (person: OrgUnitPickerPerson) => {
        onSelect(person);
        onClose();
    };

    return (
        <UserPickerModalShell
            title={title}
            onClose={onClose}
            filters={
                <>
                    <UserPickerSearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder}/>
                    <OrgUnitMultiSelectFilter options={treeOptions} selectedKeys={selectedKeys} onChange={setSelectedKeys}/>
                </>
            }
        >
            <UserPickerListStatus
                loading={loading}
                error={error ? t("selectApproverModal.loadUsersError") : null}
                isEmpty={filtered.length === 0}
            />

            {!loading && !error && filtered.length > 0 && (
                <div className="flex flex-col gap-1">
                    {filtered.map((p) => {
                        const isSelected = p.id === selectedId;

                        return (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handlePick(p)}
                                className={`flex items-center gap-3 rounded-[10px] px-3 py-[10px] text-left transition-colors cursor-pointer ${
                                    isSelected ? "bg-[#ececfc]" : "hover:bg-[#f6f8fb]"
                                }`}
                            >
                                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f0f1fb] text-[#4e57d6]">
                                    <UserIcon size={16}/>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className={`block truncate text-[13px] font-semibold ${isSelected ? "text-[#4e57d6]" : "text-[#26324a]"}`}>
                                        <HighlightText text={p.fullName} query={search}/>
                                    </span>
                                    {(p.position || p.orgUnit) && (
                                        <div className="truncate text-[11.5px] text-[#8b97ab]">
                                            <HighlightText
                                                text={[p.position, p.orgUnit].filter(Boolean).join(" · ")}
                                                query={search}
                                            />
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </UserPickerModalShell>
    );
}
