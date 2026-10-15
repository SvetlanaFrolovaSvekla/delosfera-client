/**
 * Книга приказов по личному составу.
 *
 * Отдельная от приказов по основной деятельности: срок хранения у неё особый,
 * и нумерация своя — «12-лс». Смешивать их нельзя.
 */

import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {Download, Plus, ScrollText} from "lucide-react";
import {
    hrOrderService,
    ORDER_STATUS_ORDER,
    type HrOrderKind, type HrOrderKindInfo, type HrOrderListItem, type HrOrderStatus,
} from "@/service/hrOrderService/hrOrderService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {
    Badge, Cell, DataTable, Row,
    formatDate, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";
import {HrOrderEditModal} from "@/components/hr/HrOrderEditModal.tsx";
import {HrOrderCardModal} from "@/components/hr/HrOrderCardModal.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

const STATUS_TONE: Record<HrOrderStatus, BadgeTone> = {
    Signed: "good",
    Draft: "neutral",
    OnSigning: "info",
    Cancelled: "bad",
};

export function HrOrdersPage() {
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageHrOrders);

    const [kinds, setKinds] = useState<HrOrderKindInfo[]>([]);
    const [rows, setRows] = useState<HrOrderListItem[]>([]);
    const [status, setStatus] = useState<HrOrderStatus | "">("");
    const [kind, setKind] = useState<HrOrderKind | "">("");
    const [text, setText] = useState("");
    /** Текст, по которому список реально отобран — его и подсвечиваем в строках. */
    const [appliedText, setAppliedText] = useState("");
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const [editing, setEditing] = useState<number | null | "new">(null);
    const [opened, setOpened] = useState<number | null>(null);

    useEffect(() => {
        hrOrderService.kinds().then(setKinds).catch(() => {});
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const result = await hrOrderService.list({
                status: status || undefined,
                kind: kind || undefined,
                text: text.trim() || undefined,
                pageSize: 200,
            });
            setRows(result.items);
            setAppliedText(text.trim());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, kind]);

    /** Название вида приказа — из перевода; если такого вида в локалях нет, берём то, что прислал сервер. */
    const kindTitle = (value: HrOrderKind) =>
        t(`hrOrdersPage.kinds.${value}`, {defaultValue: kinds.find((k) => k.kind === value)?.title ?? value});

    const doExport = async () => {
        setExporting(true);
        try {
            await hrOrderService.exportRegistry({
                status: status || undefined,
                kind: kind || undefined,
                text: text.trim() || undefined,
            });
        } finally {
            setExporting(false);
        }
    };

    const kindOptions = [
        {value: "", label: t("hrOrdersPage.anyKind") /* Любой вид */},
        ...kinds.map((k) => ({value: k.kind, label: kindTitle(k.kind)})),
    ];

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px] flex flex-col gap-4">
            <PageHeader
                title={t("hrOrdersPage.title") /* Приказы по личному составу */}
                description={t("hrOrdersPage.description") /* Книга регистрации: приём, перевод, отпуск, командировка, увольнение */}
                actions={(
                    <>
                        <button
                            type="button"
                            onClick={() => void doExport()}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[13px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Download className="w-[16px] h-[16px]" strokeWidth={2}/>
                            {exporting
                                ? t("hrOrdersPage.exporting") /* Готовим… */
                                : t("hrOrdersPage.exportExcel") /* Выгрузить в Excel */}
                        </button>
                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setEditing("new")}
                                className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                            >
                                <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                                {t("hrOrdersPage.issue") /* Издать приказ */}
                            </button>
                        )}
                    </>
                )}
            />

            <Tabs<HrOrderStatus | "">
                className=""
                tabs={[
                    {id: "", label: t("hrOrdersPage.statusAll") /* Все */},
                    ...ORDER_STATUS_ORDER.map((value) => ({
                        id: value,
                        label: t(`hrOrdersPage.statuses.${value}`),
                    })),
                ]}
                value={status}
                onChange={setStatus}
            />

            <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[260px]">
                    <SearchBar
                        variant="gray"
                        value={text}
                        onChange={setText}
                        onSubmit={() => void load()}
                        placeholder={t("hrOrdersPage.searchPlaceholder") /* Заголовок или номер */}
                    />
                </div>
                <SelectDropdown
                    options={kindOptions}
                    value={kind}
                    onChange={(value) => setKind(value as HrOrderKind | "")}
                    minWidth="200px"
                />
            </div>

            {loading ? (
                <Loader label={t("hrOrdersPage.loading") /* Загружаем книгу… */}/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title={t("hrOrdersPage.emptyTitle") /* Приказов нет */}
                    description={t("hrOrdersPage.emptyDescription") /* По выбранным условиям в книге ничего не нашлось. */}
                />
            ) : (
                <DataTable
                    headers={[
                        t("hrOrdersPage.columns.number"), /* Номер */
                        t("hrOrdersPage.columns.kind"), /* Вид */
                        t("hrOrdersPage.columns.title"), /* Заголовок */
                        t("hrOrdersPage.columns.employees"), /* Сотрудники */
                        t("hrOrdersPage.columns.effective"), /* Действует */
                        t("hrOrdersPage.columns.status"), /* Состояние */
                    ]}
                >
                    {rows.map((order) => (
                        <Row key={order.id} onClick={() => setOpened(order.id)}>
                            <Cell mono>
                                {order.regNumber
                                    ? <HighlightText text={order.regNumber} query={appliedText}/>
                                    : t("hrOrdersPage.draft") /* проект */}
                                <span className="mt-0.5 block text-[11.5px] text-[#8b97ab]">
                                    {formatDate(order.orderDate)}
                                </span>
                            </Cell>

                            <Cell nowrap>{kindTitle(order.kind)}</Cell>

                            <Cell strong className="max-w-[320px]">
                                <span className="line-clamp-2">
                                    <HighlightText text={order.title} query={appliedText}/>
                                </span>
                                {order.basis && (
                                    <span className="mt-0.5 block text-[11.5px] font-normal text-[#8b97ab]">
                                        {t("hrOrdersPage.basis", {basis: order.basis}) /* основание: … */}
                                    </span>
                                )}
                            </Cell>

                            <Cell>
                                {order.employees.length === 0 ? "—" : (
                                    <>
                                        {order.employees.slice(0, 2).map((e) => e.name).filter(Boolean).join(", ")}
                                        {order.employees.length > 2 && (
                                            <span className="text-[#8b97ab]">
                                                {" "}{t("hrOrdersPage.andMore", {total: order.employees.length - 2})
                                                /* и ещё N */}
                                            </span>
                                        )}
                                    </>
                                )}
                            </Cell>

                            <Cell mono>
                                {order.effectiveFrom
                                    ? `${formatDate(order.effectiveFrom)}${
                                        order.effectiveTo ? ` — ${formatDate(order.effectiveTo)}` : ""}`
                                    : "—"}
                            </Cell>

                            <Cell nowrap>
                                <Badge tone={STATUS_TONE[order.status]}>
                                    {t(`hrOrdersPage.statuses.${order.status}`)}
                                </Badge>
                                {order.status === "Signed" && !order.acknowledgementSheetId && (
                                    <Tooltip content={t("hrOrdersPage.notAcknowledgedHint")} side="top" className="w-fit">
                                        <span className="mt-1 flex items-center gap-1 text-[11.5px] text-[#b3730a]">
                                            <ScrollText size={12}/>
                                            {t("hrOrdersPage.notAcknowledged") /* без ознакомления */}
                                        </span>
                                    </Tooltip>
                                )}
                            </Cell>
                        </Row>
                    ))}
                </DataTable>
            )}

            {editing !== null && (
                <HrOrderEditModal
                    orderId={editing === "new" ? null : editing}
                    kinds={kinds}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        void load();
                    }}
                />
            )}

            {opened !== null && (
                <HrOrderCardModal
                    id={opened}
                    kinds={kinds}
                    canManage={canManage}
                    onClose={() => setOpened(null)}
                    onChanged={() => void load()}
                    onEdit={(id) => {
                        setOpened(null);
                        setEditing(id);
                    }}
                />
            )}
        </div>
    );
}
