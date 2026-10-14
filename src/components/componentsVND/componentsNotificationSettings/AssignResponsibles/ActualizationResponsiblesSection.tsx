// Раздел "Ответственные сотрудники за актуализацию" настроек рассылок по актуализации ВНД.
// Список общий для всех уведомлений раздела - сейчас единственное уведомление, использующее
// его, это ежемесячная сводка (см. ActualizationMonthlyDigestSection), но справочник
// самостоятельный: отвечает "кто отвечает за актуализацию по СП", а не "кто получает конкретно
// это письмо".
import {useTranslation} from "react-i18next";
import {useEffect, useMemo, useState} from "react";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {
    actualizationNotificationsService,
    type ActualizationNotificationResponsible,
} from "@/service/actualizationNotificationsService/actualizationNotificationsService.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {
    AssignResponsiblesModal,
    type AssignResponsiblesSelectedUser,
} from "@/components/componentsVND/componentsNotificationSettings/AssignResponsibles/AssignResponsiblesModal.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {TreeSingleSelectModal} from "@/components/componentsGeneral/selects/SingleSelects/TreeSingleSelectModal.tsx";
import {Pencil, Plus, Users} from "lucide-react";

export function ActualizationResponsiblesSection() {
    const {t} = useTranslation();
    const {orgUnitOptions} = useDictionaries();

    const [responsibles, setResponsibles] = useState<ActualizationNotificationResponsible[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [query, setQuery] = useState("");

    const [pickerOpen, setPickerOpen] = useState(false);
    const [editingOrgUnitId, setEditingOrgUnitId] = useState<number | null>(null);

    useEffect(() => {
        actualizationNotificationsService.getResponsibles()
            .then(setResponsibles)
            // Пустая строка = ошибка без текста от сервера: тогда показываем свой перевод (t в эффекте не используем)
            .catch(() => setLoadError(""));
    }, []);

    const byOrgUnit = useMemo(() => {
        const map = new Map<number, ActualizationNotificationResponsible[]>();
        for (const r of responsibles ?? []) {
            const list = map.get(r.orgUnitId) ?? [];
            list.push(r);
            map.set(r.orgUnitId, list);
        }
        return map;
    }, [responsibles]);

    const assignedUnits = useMemo(
        () => Array.from(byOrgUnit.entries())
            .map(([orgUnitId, list]) => ({
                orgUnitId,
                orgUnitName: list[0]?.orgUnitName ?? "—",
                names: list.map((x) => x.userFullName),
            }))
            .sort((a, b) => a.orgUnitName.localeCompare(b.orgUnitName, "ru")),
        [byOrgUnit],
    );

    const filteredUnits = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return assignedUnits;
        return assignedUnits.filter((u) => u.orgUnitName.toLowerCase().includes(q));
    }, [assignedUnits, query]);

    const editingOrgUnitName = editingOrgUnitId != null
        ? (orgUnitOptions.find((o) => o.key === String(editingOrgUnitId))?.label ?? "—")
        : null;
    const editingInitialUsers: AssignResponsiblesSelectedUser[] = editingOrgUnitId != null
        ? (byOrgUnit.get(editingOrgUnitId) ?? []).map((x) => ({
            id: x.userId,
            fullName: x.userFullName,
            orgUnitId: x.userOrgUnitId,
            orgUnitName: x.userOrgUnitName,
        }))
        : [];

    if (responsibles === null && loadError === null) {
        return (
            <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                {/* Загрузка… - подпись Loader по умолчанию (general.loading) */}
                <Loader/>
            </div>
        );
    }

    return (
        <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#ececfc] text-[#4e57d6]">
                    <Users size={17} strokeWidth={1.8}/>
                </span>
                <div>
                    <h3 className="m-0 text-[14.5px] font-bold text-[#1c2740]">
                        {/* Ответственные сотрудники за актуализацию */}
                        {t("notificationMailingSettingsPage.responsiblesForm.title")}
                    </h3>
                    <p className="mt-0.5 text-[12px] text-[#8b97ab]">
                        {/* По каждому структурному подразделению назначаются сотрудники, ответственные за актуализацию ВНД своего подразделения. Они будут получать уведомления о ВНД, разработчиком или ответственным исполнителем которых является соответствующее структурное подразделение. */}
                        {t("notificationMailingSettingsPage.responsiblesForm.description")}
                    </p>
                </div>
            </div>

            {loadError !== null && (
                <div
                    className="mt-4 rounded-[10px] border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-[10px] text-[12.5px] text-[#c0392b]">
                    {/* Не удалось загрузить список ответственных */}
                    {loadError || t("notificationMailingSettingsPage.responsiblesForm.loadError")}
                </div>
            )}

            <div className="mt-4 flex items-center gap-2.5">
                {/* Поиск по СП… */}
                <SearchBar value={query} onChange={setQuery} placeholder={t("notificationMailingSettingsPage.responsiblesForm.searchPlaceholder")}/>
                <button
                    onClick={() => setPickerOpen(true)}
                    className="cursor-pointer inline-flex flex-none items-center gap-1.5 h-[38px] rounded-[10px] border-none bg-[#4e57d6] px-3.5 text-[13px] font-semibold text-white hover:brightness-[1.06]"
                >
                    <Plus size={16} strokeWidth={2.2}/>
                    {/* Назначить ответственных */}
                    {t("notificationMailingSettingsPage.responsiblesForm.assign")}
                </button>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
                {filteredUnits.length === 0 && (
                    <div
                        className="rounded-[10px] border border-dashed border-[#e5e9f0] px-3 py-6 text-center text-[12.5px] text-[#a3adbd]">
                        {/* Ответственные ещё не назначены ни одному СП / По такому СП ничего не найдено */}
                        {assignedUnits.length === 0
                            ? t("notificationMailingSettingsPage.responsiblesForm.noneAssigned")
                            : t("notificationMailingSettingsPage.responsiblesForm.noMatch")}
                    </div>
                )}
                {filteredUnits.map((unit) => (
                    <div key={unit.orgUnitId}
                         className="flex items-center justify-between gap-3 rounded-[10px] border border-[#eef2f7] px-3 py-2.5">
                        <div className="min-w-0">
                            <HighlightText
                                text={unit.orgUnitName}
                                query={query}
                                className="text-[12.5px] font-semibold text-[#1c2740]"
                            />
                            <div className="truncate text-[12px] text-[#8b97ab]">{unit.names.join(", ")}</div>
                        </div>
                        <button
                            onClick={() => setEditingOrgUnitId(unit.orgUnitId)}
                            className="cursor-pointer inline-flex flex-none items-center gap-1.5 rounded-[8px] border border-[#e5e9f0] px-2.5 py-1.5 text-[12px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb]"
                        >
                            <Pencil size={13}/>
                            {/* Изменить */}
                            {t("notificationMailingSettingsPage.responsiblesForm.edit")}
                        </button>
                    </div>
                ))}
            </div>

            <TreeSingleSelectModal
                open={pickerOpen}
                onClose={() => setPickerOpen(false)}
                /* Выберите СП… */
                title={t("notificationMailingSettingsPage.common.selectOrgUnit")}
                options={orgUnitOptions}
                selectedKey={null}
                onSelect={(key) => {
                    if (key) setEditingOrgUnitId(Number(key));
                }}
                /* Поиск СП… */
                searchPlaceholder={t("notificationMailingSettingsPage.common.searchOrgUnit")}
            />

            {editingOrgUnitId != null && editingOrgUnitName != null && (
                <AssignResponsiblesModal
                    orgUnitId={editingOrgUnitId}
                    orgUnitName={editingOrgUnitName}
                    initialUsers={editingInitialUsers}
                    onClose={() => setEditingOrgUnitId(null)}
                    onSaved={setResponsibles}
                />
            )}
        </div>
    );
}
