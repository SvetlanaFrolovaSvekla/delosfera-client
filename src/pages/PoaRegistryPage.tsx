import {useEffect, useState} from "react";
import {AlertTriangle, Plus} from "lucide-react";
import {
    poaService,
    POA_STATUS_ORDER,
    POA_STATUS_TITLE,
    type Poa,
    type PoaStatus,
} from "@/service/poaService/poaService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {
    Badge, Cell, DataTable, FilterChip, Row,
    formatDate, formatDaysLeft, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";
import {PoaEditModal} from "@/components/poa/PoaEditModal.tsx";
import {PoaCardModal} from "@/components/poa/PoaCardModal.tsx";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

/**
 * Реестр доверенностей.
 *
 * Сверху — истекающие. Доверенность, о которой вспомнили в день окончания, уже
 * стоила кому-то сорванной сделки: продлевают заранее, и список должен об этом
 * напоминать сам, а не ждать, пока в него заглянут.
 */

const STATUS_TONE: Record<PoaStatus, BadgeTone> = {
    Active: "good",
    Draft: "neutral",
    OnApproval: "info",
    Expired: "neutral",
    Revoked: "bad",
};

/** За сколько дней доверенность считается истекающей. Столько же берёт фоновая служба. */
const EXPIRING_DAYS = 30;

export function PoaRegistryPage() {
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManagePowersOfAttorney);

    const [rows, setRows] = useState<Poa[]>([]);
    const [expiring, setExpiring] = useState<Poa[]>([]);
    const [status, setStatus] = useState<PoaStatus | "">("Active");
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);

    const [editing, setEditing] = useState<Poa | null | "new">(null);
    const [opened, setOpened] = useState<number | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [list, soon] = await Promise.all([
                poaService.search({
                    statuses: status ? [status] : undefined,
                    text: text.trim() || undefined,
                    pageSize: 200,
                }),
                poaService.expiring(EXPIRING_DAYS),
            ]);
            setRows(list.items);
            setExpiring(soon);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const daysUntil = (validTo: string) =>
        Math.round((new Date(validTo).getTime() - Date.now()) / 86_400_000);

    return (
        <div className="flex flex-col gap-5 p-6">
            <PageHeader
                title="Доверенности"
                description="Кто, кому, на что и на какой срок"
                actions={canManage ? (
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="flex items-center gap-2 rounded-[10px] bg-[#2f68f5] px-4 py-2
                                   text-[14px] font-medium text-white transition hover:bg-[#2554cc]"
                    >
                        <Plus size={17}/>
                        Выдать доверенность
                    </button>
                ) : undefined}
            />

            {/* Истекающие наверху: продлевают заранее, а не в день окончания. */}
            {expiring.length > 0 && (
                <section className="rounded-[14px] border border-[#f0dcc0] bg-[#fdf8ee] p-4">
                    <div className="mb-2.5 flex items-center gap-2">
                        <AlertTriangle size={17} className="text-[#b3730a]"/>
                        <h2 className="text-[14px] font-semibold text-[#7a5407]">
                            Истекают в ближайшие {EXPIRING_DAYS} дней — {expiring.length}
                        </h2>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {expiring.slice(0, 8).map((poa) => (
                            <button
                                key={poa.id}
                                type="button"
                                onClick={() => setOpened(poa.id)}
                                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[8px]
                                           border border-[#e7dcc4] bg-white px-3 py-2 text-left
                                           transition hover:border-[#b3730a]"
                            >
                                <span className="font-mono text-[12px] text-[#8593a8]">
                                    {poa.regNumber ?? "б/н"}
                                </span>
                                <span className="text-[13.5px] font-medium text-[#101a2c]">
                                    {poa.holderName}
                                </span>
                                <span className="text-[12.5px] text-[#8593a8]">
                                    {poa.holderUnit ?? poa.holderPosition ?? ""}
                                </span>
                                <span className="ml-auto text-[12.5px] font-medium text-[#b3730a]">
                                    до {formatDate(poa.validTo)} · {formatDaysLeft(daysUntil(poa.validTo))}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <div className="flex flex-wrap items-center gap-2">
                <FilterChip active={status === ""} onClick={() => setStatus("")}>Все</FilterChip>
                {POA_STATUS_ORDER.map((value) => (
                    <FilterChip key={value} active={status === value} onClick={() => setStatus(value)}>
                        {POA_STATUS_TITLE[value]}
                    </FilterChip>
                ))}

                <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && void load()}
                    placeholder="ФИО, номер или фраза из полномочий"
                    className="ml-auto w-[300px] rounded-[9px] border border-[#e1e7ef] px-3 py-1.5
                               text-[13px] outline-none transition focus:border-[#2f68f5]"
                />
            </div>

            {loading ? (
                <Loader label="Загружаем реестр…"/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title="Доверенностей нет"
                    description={status ? "По выбранному состоянию ничего не нашлось." : "Реестр пуст."}
                />
            ) : (
                <DataTable
                    headers={["Номер", "Кому", "Подразделение", "Полномочия", "Срок", "Состояние"]}
                >
                    {rows.map((poa) => {
                        const days = daysUntil(poa.validTo);
                        const soon = poa.status === "Active" && days <= EXPIRING_DAYS;

                        return (
                            <Row key={poa.id} onClick={() => setOpened(poa.id)} alert={soon && days < 0}>
                                <Cell mono>{poa.regNumber ?? "б/н"}</Cell>
                                <Cell strong>
                                    {poa.holderName}
                                    {poa.parentRegNumber && (
                                        <span className="ml-2 font-mono text-[11px] text-[#8593a8]">
                                            передоверие по {poa.parentRegNumber}
                                        </span>
                                    )}
                                </Cell>
                                <Cell>{poa.holderUnit ?? poa.holderPosition ?? "—"}</Cell>
                                <Cell className="max-w-[380px]">
                                    <span className="line-clamp-2">{poa.powers}</span>
                                    {poa.amountLimit !== null && (
                                        <span className="mt-0.5 block font-mono text-[11.5px] text-[#8593a8]">
                                            до {poa.amountLimit.toLocaleString("ru-RU")} {poa.amountCurrency}
                                        </span>
                                    )}
                                </Cell>
                                <Cell mono>
                                    {formatDate(poa.validFrom)} — {formatDate(poa.validTo)}
                                    {soon && (
                                        <span className="mt-0.5 block text-[11.5px] font-semibold text-[#b3730a]">
                                            {formatDaysLeft(days)}
                                        </span>
                                    )}
                                </Cell>
                                <Cell nowrap>
                                    <Badge tone={STATUS_TONE[poa.status]}>
                                        {POA_STATUS_TITLE[poa.status]}
                                    </Badge>
                                </Cell>
                            </Row>
                        );
                    })}
                </DataTable>
            )}

            {editing !== null && (
                <PoaEditModal
                    poa={editing === "new" ? null : editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        void load();
                    }}
                />
            )}

            {opened !== null && (
                <PoaCardModal
                    id={opened}
                    canManage={canManage}
                    onClose={() => setOpened(null)}
                    onChanged={() => void load()}
                    onEdit={(poa) => {
                        setOpened(null);
                        setEditing(poa);
                    }}
                />
            )}
        </div>
    );
}
