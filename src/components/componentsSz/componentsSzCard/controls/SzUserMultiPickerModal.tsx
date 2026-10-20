// Модалка множественного выбора сотрудников (согласующие СЗ). Тот же каркас, что и у
// UserOrgUnitPickerModal: UserPickerModalShell, поиск по ФИО и иерархический фильтр по СП
// через useOrgUnitFilter, - чтобы пикер выглядел и вёл себя так же, как всюду в системе.
// Отличие одно: строки отмечаются галочками, окно закрывается кнопкой «Готово».
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useOrgUnitFilter} from "@/hooks/vndHooks/useOrgUnitFilter.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {
    UserPickerModalShell,
    UserPickerSearchInput,
    UserPickerListStatus,
} from "@/components/componentsGeneral/userPicker/UserPickerModalShell.tsx";
import {OrgUnitMultiSelectFilter} from "@/components/componentsGeneral/selects/OrgUnitMultiSelectFilter.tsx";
import {Check, User as UserIcon} from "lucide-react";
import {ACCENT, type Accent} from "@/constants/accent.ts";
import {type PickableUser, seniority} from "@/constants/pickableUser.ts";

interface Props {
    people: PickableUser[];
    /** Выбранные: порядок сохраняется, новые добавляются в конец. */
    value: number[];
    onChange: (ids: number[]) => void;
    title: string;
    onClose: () => void;
    /** Акцентный цвет (галочки, подсветка выбранных, кнопка «Готово»). По умолчанию фиолетовый. */
    accent?: Accent;
}

export function SzUserMultiPickerModal({people, value, onChange, title, onClose, accent = "violet"}: Props) {
    const {t} = useTranslation();
    const a = ACCENT[accent];
    const [search, setSearch] = useState("");
    const {treeOptions, selectedKeys, setSelectedKeys, selectedIds, loading, error} = useOrgUnitFilter();

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return people
            .filter((p) => selectedIds.size === 0 || (p.orgUnitId != null && selectedIds.has(p.orgUnitId)))
            .filter((p) =>
                term === ""
                    ? true
                    : `${p.fullName} ${p.position ?? ""} ${p.orgUnit ?? ""}`.toLowerCase().includes(term),
            )
            // Подбор согласующих — по старшинству (Правление → руководители → остальные),
            // внутри группы по алфавиту: виза собирается сверху вниз.
            .sort((a, b) => seniority(a) - seniority(b) || a.fullName.localeCompare(b.fullName, "ru"));
    }, [people, search, selectedIds]);

    const toggle = (id: number) =>
        onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

    return (
        <UserPickerModalShell
            title={title}
            onClose={onClose}
            filters={
                <>
                    <UserPickerSearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder={t("szCard.fields.userSearch")}
                        accent={accent}
                    />
                    <OrgUnitMultiSelectFilter
                        options={treeOptions}
                        selectedKeys={selectedKeys}
                        onChange={setSelectedKeys}
                        accent={accent}
                    />
                </>
            }
        >
            <div className="flex min-h-full flex-col">
                <div className="flex-1">
                    <UserPickerListStatus
                        loading={loading}
                        error={error ? t("selectApproverModal.loadUsersError") : null}
                        isEmpty={filtered.length === 0}
                    />

                    {!loading && !error && filtered.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {filtered.map((p) => {
                                const checked = value.includes(p.id);

                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => toggle(p.id)}
                                        className={`flex items-center gap-3 rounded-[10px] px-3 py-[10px] text-left transition-colors cursor-pointer ${
                                            checked ? `${a.softBg}` : "hover:bg-[#f6f8fb]"
                                        }`}
                                    >
                                        <span className={`flex h-4 w-4 flex-none items-center justify-center rounded-[4px] border ${
                                            checked ? `${a.border} ${a.bg}` : "border-[#c8d2e0] bg-white"}`}>
                                            {checked && <Check size={11} className="text-white" strokeWidth={3}/>}
                                        </span>
                                        <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${a.tintBg} ${a.text}`}>
                                            <UserIcon size={16}/>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className={`block truncate text-[13px] font-semibold ${checked ? `${a.text}` : "text-[#26324a]"}`}>
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
                </div>

                <div className="sticky bottom-0 mt-2 flex items-center justify-between border-t border-[#eef0f5] bg-white px-3 py-3">
                    <span className="text-[12px] text-[#8b97ab]">
                        {t("szCard.fields.selectedCount", {count: value.length})}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`h-9 cursor-pointer rounded-[9px] border-none ${a.bg} px-4 text-[13px] font-semibold text-white ${a.hoverBg}`}
                    >
                        {t("szCard.fields.done")}
                    </button>
                </div>
            </div>
        </UserPickerModalShell>
    );
}
