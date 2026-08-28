import {useEffect, useState} from "react";
import {Plus, ScrollText} from "lucide-react";
import {
    hrOrderService,
    ORDER_STATUS_ORDER, ORDER_STATUS_TITLE,
    type HrOrderKind, type HrOrderKindInfo, type HrOrderListItem, type HrOrderStatus,
} from "@/service/hrOrderService/hrOrderService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    Badge, Cell, DataTable, FilterChip, Row,
    formatDate, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";
import {HrOrderEditModal} from "@/components/hr/HrOrderEditModal.tsx";
import {HrOrderCardModal} from "@/components/hr/HrOrderCardModal.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

/**
 * Книга приказов по личному составу.
 *
 * Отдельная от приказов по основной деятельности: срок хранения у неё особый,
 * и нумерация своя — «12-лс». Смешивать их нельзя.
 */

const STATUS_TONE: Record<HrOrderStatus, BadgeTone> = {
    Signed: "good",
    Draft: "neutral",
    OnSigning: "info",
    Cancelled: "bad",
};

export function HrOrdersPage() {
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageHrOrders);

    const [kinds, setKinds] = useState<HrOrderKindInfo[]>([]);
    const [rows, setRows] = useState<HrOrderListItem[]>([]);
    const [status, setStatus] = useState<HrOrderStatus | "">("");
    const [kind, setKind] = useState<HrOrderKind | "">("");
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, kind]);

    const kindTitle = (value: HrOrderKind) =>
        kinds.find((k) => k.kind === value)?.title ?? value;

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Приказы по личному составу"
                description="Книга регистрации: приём, перевод, отпуск, командировка, увольнение"
                actions={canManage ? (
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="flex items-center gap-2 rounded-[10px] bg-[#2f68f5] px-4 py-2
                                   text-[14px] font-medium text-white transition hover:bg-[#2554cc]"
                    >
                        <Plus size={17}/>
                        Издать приказ
                    </button>
                ) : undefined}
            />

            <div className="flex flex-wrap items-center gap-2">
                <FilterChip active={status === ""} onClick={() => setStatus("")}>Все</FilterChip>
                {ORDER_STATUS_ORDER.map((value) => (
                    <FilterChip key={value} active={status === value} onClick={() => setStatus(value)}>
                        {ORDER_STATUS_TITLE[value]}
                    </FilterChip>
                ))}

                <span className="mx-1 h-5 w-px bg-[#e1e7ef]"/>

                <select
                    value={kind}
                    onChange={(event) => setKind(event.target.value as HrOrderKind | "")}
                    className="rounded-[9px] border border-[#e1e7ef] px-3 py-1.5 text-[13px]
                               outline-none focus:border-[#2f68f5]"
                >
                    <option value="">Любой вид</option>
                    {kinds.map((k) => (
                        <option key={k.kind} value={k.kind}>{k.title}</option>
                    ))}
                </select>

                <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && void load()}
                    placeholder="Заголовок или номер"
                    className="ml-auto w-[260px] rounded-[9px] border border-[#e1e7ef] px-3 py-1.5
                               text-[13px] outline-none transition focus:border-[#2f68f5]"
                />
            </div>

            {loading ? (
                <Loader label="Загружаем книгу…"/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title="Приказов нет"
                    description="По выбранным условиям в книге ничего не нашлось."
                />
            ) : (
                <DataTable headers={["Номер", "Вид", "Заголовок", "Сотрудники", "Действует", "Состояние"]}>
                    {rows.map((order) => (
                        <Row key={order.id} onClick={() => setOpened(order.id)}>
                            <Cell mono>
                                {order.regNumber ?? "проект"}
                                <span className="mt-0.5 block text-[11.5px] text-[#8593a8]">
                                    {formatDate(order.orderDate)}
                                </span>
                            </Cell>

                            <Cell nowrap>{kindTitle(order.kind)}</Cell>

                            <Cell strong className="max-w-[320px]">
                                <span className="line-clamp-2">{order.title}</span>
                                {order.basis && (
                                    <span className="mt-0.5 block text-[11.5px] font-normal text-[#8593a8]">
                                        основание: {order.basis}
                                    </span>
                                )}
                            </Cell>

                            <Cell>
                                {order.employees.length === 0 ? "—" : (
                                    <>
                                        {order.employees.slice(0, 2).map((e) => e.name).filter(Boolean).join(", ")}
                                        {order.employees.length > 2 && (
                                            <span className="text-[#8593a8]">
                                                {" "}и ещё {order.employees.length - 2}
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
                                    {ORDER_STATUS_TITLE[order.status]}
                                </Badge>
                                {order.status === "Signed" && !order.acknowledgementSheetId && (
                                    <span
                                        title="Сотрудники ещё не ознакомлены с приказом"
                                        className="mt-1 flex items-center gap-1 text-[11.5px] text-[#b3730a]"
                                    >
                                        <ScrollText size={12}/>
                                        без ознакомления
                                    </span>
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
