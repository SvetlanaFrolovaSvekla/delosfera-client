/**
 * Журнал действий (Б-10).
 *
 * В отличие от ленты на рабочем столе, здесь виден весь журнал, а не свои записи:
 * он нужен для разбирательства — кто, что и когда сделал. Поэтому отбор по
 * сотруднику, объекту, действию и периоду, а рядом выгрузка: проверяющие работают
 * с файлом, а не с экраном.
 *
 * Подробности показываются как есть, строкой JSON. Разбирать их в человеческий вид
 * значило бы толковать чужие данные и терять то, что в них записано; при
 * разбирательстве важна точность, а не красота.
 */
import {useCallback, useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {auditLogService, type AuditFilter, type AuditPage} from "@/service/activityLogService/auditLogService.ts";
import {userService} from "@/service/userService/userService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";

const GRID_TEMPLATE = "150px 200px 220px 170px minmax(280px,1fr)";

export function AuditLogPage() {
    const {t} = useTranslation();

    // Подписи типов объекта — общие для фильтра и для колонки "Объект" в таблице.
    // Внутри компонента (не модульная константа): подписи идут через t().
    const ENTITY_LABELS: Record<string, string> = {
        Document: t("auditLog.entities.Document") /* Документ */,
        Sz: t("auditLog.entities.Sz") /* Служебная записка */,
        Vnd: t("auditLog.entities.Vnd") /* ВНД */,
        ProcurementRequest: t("auditLog.entities.ProcurementRequest") /* Заявка на закупку */,
        Tender: t("auditLog.entities.Tender") /* Конкурс */,
        RouteInstance: t("auditLog.entities.RouteInstance") /* Маршрут */,
        Resolution: t("auditLog.entities.Resolution") /* Резолюция */,
        DocumentAttachment: t("auditLog.entities.DocumentAttachment") /* Вложение */,
        Signature: t("auditLog.entities.Signature") /* Подпись */,
        SimpleSignatureRegulation: t("auditLog.entities.SimpleSignatureRegulation") /* Регламент подписи */,
        User: t("auditLog.entities.User") /* Пользователь */,
        Role: t("auditLog.entities.Role") /* Роль */,
        Substitution: t("auditLog.entities.Substitution") /* Замещение */,
    };

    const [auditPage, setAuditPage] = useState<AuditPage | null>(null);
    const [people, setPeople] = useState<{ id: number; fullName: string }[]>([]);
    const [refLists, setRefLists] = useState<{ entityTypes: string[]; actions: string[] }>({
        entityTypes: [],
        actions: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filter, setFilter] = useState<AuditFilter>({page: 1, pageSize: 50});

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setAuditPage(await auditLogService.search(filter));
        } catch (e) {
            const status = (e as { response?: { status?: number } }).response?.status;
            setError(status === 403
                ? t("auditLog.errorForbidden") /* Журнал доступен тем, кто управляет пользователями */
                : t("auditLog.errorLoad") /* Не удалось загрузить журнал */);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        auditLogService.dictionaries().then(setRefLists).catch(() => undefined);
        userService.lookup()
            .then((l) => setPeople(l.map((u) => ({id: u.id, fullName: u.fullName}))))
            .catch(() => undefined);
    }, []);

    const patchFilter = (patch: Partial<AuditFilter>) => setFilter({...filter, ...patch, page: 1});

    const exportCsv = async () => {
        try {
            setError(null);
            await auditLogService.export({...filter, page: undefined, pageSize: undefined});
        } catch {
            setError(t("auditLog.errorExport") /* Не удалось выгрузить журнал */);
        }
    };

    const total = auditPage?.total ?? 0;
    const pageSize = auditPage?.pageSize ?? 50;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = auditPage?.page ?? 1;

    const fieldClass = "h-10 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]";

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">

            <PageHeader
                title={t("auditLog.title") /* Журнал действий */}
                description= {t("auditLog.description") /* Все действия в системе: кто, что и когда сделал. Записи не изменяются и не удаляются — журнал существует, чтобы на него можно было сослаться. */}
            />

            {error && (
                <div
                    className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <section className="flex flex-wrap items-end gap-3 rounded-[12px] border border-[#e5e9f0] bg-white p-4">
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">{t("auditLog.fieldFrom") /* С */}</span>
                    <input type="datetime-local" className={fieldClass} value={filter.from ?? ""}
                           onChange={(e) => patchFilter({from: e.target.value || undefined})}/>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">{t("auditLog.fieldTo") /* По */}</span>
                    <input type="datetime-local" className={fieldClass} value={filter.to ?? ""}
                           min={filter.from} onChange={(e) => patchFilter({to: e.target.value || undefined})}/>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">{t("auditLog.fieldEmployee") /* Сотрудник */}</span>
                    <select className={`${fieldClass} w-[230px]`} value={filter.userId ?? 0}
                            onChange={(e) => patchFilter({userId: Number(e.target.value) || undefined})}>
                        <option value={0}>{t("auditLog.optionAll") /* все */}</option>
                        {people.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                    </select>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">{t("auditLog.fieldEntity") /* Объект */}</span>
                    <select className={`${fieldClass} w-[200px]`} value={filter.entityType ?? ""}
                            onChange={(e) => patchFilter({entityType: e.target.value || undefined})}>
                        <option value="">{t("auditLog.optionAll") /* все */}</option>
                        {refLists.entityTypes.map((et) => (
                            <option key={et} value={et}>{ENTITY_LABELS[et] ?? et}</option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">{t("auditLog.fieldAction") /* Действие */}</span>
                    <select className={`${fieldClass} w-[190px]`} value={filter.action ?? ""}
                            onChange={(e) => patchFilter({action: e.target.value || undefined})}>
                        <option value="">{t("auditLog.optionAll") /* все */}</option>
                        {refLists.actions.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                </label>

                <div className="flex-1"/>

                <button onClick={() => setFilter({page: 1, pageSize: 50})}
                        className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] text-[#55617a]">
                    {t("auditLog.reset") /* Сбросить */}
                </button>
                <button onClick={exportCsv} disabled={loading || total === 0}
                        className="h-10 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#2f68f5] disabled:opacity-50">
                    {t("auditLog.exportCsv") /* Выгрузить CSV */}
                </button>
            </section>

            <section className="mt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                        {t("auditLog.recordsCount", {total: total.toLocaleString("ru-RU")}) /* `Записей: ${total.toLocaleString("ru-RU")}` */}
                    </h2>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2 text-[12.5px] text-[#55617a]">
                            <button disabled={currentPage <= 1 || loading}
                                    onClick={() => setFilter({...filter, page: currentPage - 1})}
                                    className="h-8 rounded-[8px] border border-[#e5e9f0] bg-white px-3 disabled:opacity-40">
                                {t("auditLog.prevPage") /* назад */}
                            </button>
                            <span>{t("auditLog.pageOf", {
                                current: currentPage,
                                total: totalPages
                            }) /* `${currentPage} из ${totalPages}` */}</span>
                            <button disabled={currentPage >= totalPages || loading}
                                    onClick={() => setFilter({...filter, page: currentPage + 1})}
                                    className="h-8 rounded-[8px] border border-[#e5e9f0] bg-white px-3 disabled:opacity-40">
                                {t("auditLog.nextPage") /* вперёд */}
                            </button>
                        </div>
                    )}
                </div>

                {/* Внешний вид — как у таблицы "Пользователи" (UsersTable): сетка с общей
                    рамкой и скруглением вместо построчных рамок нативной <table>. */}
                <div className="bg-white border border-[#e9edf3] rounded-[14px]">
                    {/* Без overflow-x-auto/min-w-max: тот каркас (взятый из UsersTable) считает
                        ширину по max-content, а с ним последняя колонка ("Подробности" — это
                        JSON целиком) никогда не переносится и вместо этого просто вытягивает
                        всю строку в одну линию за пределы карточки. Здесь колонки фиксированы,
                        кроме последней (1fr) — переполнение по ширине им не грозит. */}
                    <div
                        className="grid gap-3 px-5 py-3 border-b border-[#eef2f7] bg-[#fafbfd] rounded-t-[14px] text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd]"
                        style={{gridTemplateColumns: GRID_TEMPLATE}}
                    >
                        <div className="whitespace-nowrap">{t("auditLog.columnWhen") /* Когда */}</div>
                        <div className="whitespace-nowrap">{t("auditLog.columnWho") /* Кто */}</div>
                        <div className="whitespace-nowrap">{t("auditLog.columnEntity") /* Объект */}</div>
                        <div className="whitespace-nowrap">{t("auditLog.columnAction") /* Действие */}</div>
                        <div className="whitespace-nowrap">{t("auditLog.columnDetails") /* Подробности */}</div>
                    </div>

                    {(auditPage?.items.length ?? 0) === 0 ? (
                        <div className="px-5 py-8 text-center text-[13px] text-[#8b97ab] rounded-b-[14px]">
                            {loading
                                ? t("general.loading") /* Загрузка… */
                                : t("auditLog.noResults") /* По этому отбору записей нет */}
                        </div>
                    ) : (
                        auditPage!.items.map((entry, index) => (
                            <div
                                key={entry.id}
                                className={`grid gap-3 items-start px-5 py-3 hover:bg-[#fbfcfe] transition ${
                                    index === auditPage!.items.length - 1 ? "rounded-b-[14px]" : "border-b border-[#f3f6f9]"
                                }`}
                                style={{gridTemplateColumns: GRID_TEMPLATE}}
                            >
                                <div className="whitespace-nowrap tabular-nums text-[12.5px] text-[#55617a]">
                                    {formatDateTime(entry.at)}
                                </div>
                                <div className="min-w-0 truncate text-[13px] text-[#26324a]">
                                    {entry.userName ?? <span
                                        className="text-[#8b97ab]">{t("auditLog.systemActor") /* система */}</span>}
                                </div>
                                <div className="whitespace-nowrap text-[13px] text-[#26324a]">
                                    {ENTITY_LABELS[entry.entityType] ?? entry.entityType}
                                    <span className="text-[#a3adbd]"> #{entry.entityId}</span>
                                </div>
                                <div className="min-w-0 truncate text-[13px] text-[#26324a]">{entry.actionText}</div>
                                <div
                                    className="min-w-0 font-mono text-[11.5px] leading-[1.5] text-[#8b97ab]"
                                    style={{wordBreak: "break-word"}}
                                >
                                    {entry.payload ?? "—"}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
