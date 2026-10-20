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
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {formatDateTime} from "@/utils/dateUtils.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {ActivityVsAuditNote} from "@/components/componentsGeneral/knowledgeBaseComponents/ActivityVsAuditNote.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {Download, RotateCcw} from "lucide-react";

const GRID_TEMPLATE = "150px 200px 220px 170px minmax(280px,1fr)";

/**
 * "дд.мм.гггг чч:мм" (как в календаре) -> "гггг-мм-ддTчч:мм" (как ждёт бэкенд).
 * Пока введено не всё или такой даты нет (31.02) — undefined, и отбор не меняется.
 */
function displayToIsoDateTime(v: string): string | undefined {
    const m = /^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/.exec(v);
    if (!m) return undefined;
    const [, dd, mo, yyyy, hh, mi] = m;
    const d = new Date(Number(yyyy), Number(mo) - 1, Number(dd), Number(hh), Number(mi));
    if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mo) - 1 || d.getDate() !== Number(dd)
        || d.getHours() !== Number(hh) || d.getMinutes() !== Number(mi)) return undefined;
    return `${yyyy}-${mo}-${dd}T${hh}:${mi}`;
}

const FIELD_LABEL = "text-[11.5px] text-[#8b97ab]";

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
    const [people, setPeople] = useState<UserLookupItem[]>([]);
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
            .then(setPeople)
            .catch(() => undefined);
    }, []);

    const patchFilter = (patch: Partial<AuditFilter>) => setFilter({...filter, ...patch, page: 1});

    // Поля периода хранят то, что набрал человек ("дд.мм.гггг чч:мм"); в отбор попадает
    // только полностью введённое значение — иначе на каждую цифру шёл бы запрос.
    const [fromText, setFromText] = useState("");
    const [toText, setToText] = useState("");

    const changeFrom = (v: string) => {
        setFromText(v);
        if (!v) patchFilter({from: undefined});
        else {
            const iso = displayToIsoDateTime(v);
            if (iso) patchFilter({from: iso});
        }
    };

    const changeTo = (v: string) => {
        setToText(v);
        if (!v) patchFilter({to: undefined});
        else {
            const iso = displayToIsoDateTime(v);
            if (iso) patchFilter({to: iso});
        }
    };

    const resetFilter = () => {
        setFilter({page: 1, pageSize: 50});
        setFromText("");
        setToText("");
    };

    const allOption = t("auditLog.optionAll"); /* все */
    const entityOptions = [
        {value: "", label: allOption},
        ...refLists.entityTypes.map((et) => ({value: et, label: ENTITY_LABELS[et] ?? et})),
    ];
    const actionOptions = [
        {value: "", label: allOption},
        ...refLists.actions.map((a) => ({value: a, label: a})),
    ];

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

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">

            <PageHeader
                title={t("auditLog.title") /* Журнал действий */}
                description= {t("auditLog.description") /* Все действия в системе: кто, что и когда сделал. Записи не изменяются и не удаляются — журнал существует, чтобы на него можно было сослаться. */}
            />

            {/* Чем отличается от "Активности на портале" - свёрнуто по умолчанию */}
            <ActivityVsAuditNote current="audit" className="mb-4"/>

            {error && (
                <div
                    className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <section className="flex flex-wrap items-end gap-3 rounded-[14px] border border-[#e9edf3] bg-white p-[22px]">
                <div className="flex flex-col gap-1.5">
                    <span className={FIELD_LABEL}>{t("auditLog.fieldFrom") /* С */}</span>
                    <div className="w-[190px]">
                        <DatePickerInput withTime defaultTime="00:00" value={fromText} onChange={changeFrom}/>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className={FIELD_LABEL}>{t("auditLog.fieldTo") /* По */}</span>
                    <div className="w-[190px]">
                        <DatePickerInput withTime defaultTime="23:59" value={toText} onChange={changeTo}/>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className={FIELD_LABEL}>{t("auditLog.fieldEmployee") /* Сотрудник */}</span>
                    <div className="w-[230px]">
                        <UserPickerField
                            compact
                            clearable
                            people={people}
                            value={filter.userId ?? null}
                            onChange={(id) => patchFilter({userId: id})}
                            onClear={() => patchFilter({userId: undefined})}
                            placeholder={allOption}
                            modalTitle={t("auditLog.fieldEmployee") /* Сотрудник */}
                            searchPlaceholder={t("substitutions.searchEmployee") /* Поиск по ФИО */}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className={FIELD_LABEL}>{t("auditLog.fieldEntity") /* Объект */}</span>
                    <SelectDropdown
                        options={entityOptions}
                        value={filter.entityType ?? ""}
                        onChange={(v) => patchFilter({entityType: v || undefined})}
                        minWidth="200px"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className={FIELD_LABEL}>{t("auditLog.fieldAction") /* Действие */}</span>
                    <SelectDropdown
                        options={actionOptions}
                        value={filter.action ?? ""}
                        onChange={(v) => patchFilter({action: v || undefined})}
                        searchable
                        minWidth="190px"
                    />
                </div>

                <div className="flex-1"/>

                <button type="button" onClick={resetFilter}
                        className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#55617a] cursor-pointer hover:bg-[#f6f8fb]">
                    <RotateCcw size={14} strokeWidth={2}/>
                    {t("auditLog.reset") /* Сбросить */}
                </button>
                <button type="button" onClick={exportCsv} disabled={loading || total === 0}
                        className="inline-flex h-10 items-center gap-2 rounded-[10px] border-none bg-[#4e57d6] px-[18px] text-[13px] font-semibold text-white cursor-pointer shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed">
                    <Download size={14} strokeWidth={2.25}/>
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

                <div className="bg-white border border-[#e9edf3] rounded-[14px]">
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
