/**
 * Секция "Канцелярия"
 * Реестр доверенностей, страница "Доверенности"
 *
 * Сверху — истекающие. Доверенность, о которой вспомнили в день окончания, уже
 * стоила кому-то сорванной сделки: продлевают заранее, и список должен об этом
 * напоминать сам, а не ждать, пока в него заглянут.
 */
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {
    poaService,
    POA_STATUS_ORDER,
    type Poa,
    type PoaStatus,
} from "@/service/poaService/poaService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {PoaEditModal} from "@/components/poa/PoaEditModal.tsx";
import {PoaCardModal} from "@/components/poa/PoaCardModal.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {
    Badge, Cell, DataTable, Row,
    formatDate, formatDaysLeft, type BadgeTone,
} from "@/components/componentsGeneral/DataTable.tsx";
import {AlertTriangle, Plus} from "lucide-react";

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
    const {t} = useTranslation();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManagePowersOfAttorney);

    const [rows, setRows] = useState<Poa[]>([]);
    const [expiring, setExpiring] = useState<Poa[]>([]);
    const [status, setStatus] = useState<PoaStatus | "">("Active");
    const [text, setText] = useState("");
    /** Текст, по которому список реально отобран — его и подсвечиваем в строках. */
    const [appliedText, setAppliedText] = useState("");
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
            setAppliedText(text.trim());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const daysUntil = (validTo: string) =>
        // eslint-disable-next-line react-hooks/purity
        Math.round((new Date(validTo).getTime() - Date.now()) / 86_400_000);

    const noNumber = t("poaRegistryPage.noNumber"); /* б/н */

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px] flex flex-col gap-4">
            <PageHeader
                title={t("poaRegistryPage.title") /* Доверенности */}
                description={t("poaRegistryPage.description") /* Кто, кому, на что и на какой срок */}
                actions={canManage ? (
                    <button
                        type="button"
                        onClick={() => setEditing("new")}
                        className="inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[18px] h-[18px]" strokeWidth={2}/>
                        {t("poaRegistryPage.grant") /* Выдать доверенность */}
                    </button>
                ) : undefined}
            />

            {/* Истекающие наверху: продлевают заранее, а не в день окончания. */}
            {expiring.length > 0 && (
                <section className="rounded-[14px] border border-[#f0dcc0] bg-[#fdf8ee] p-4">
                    <div className="mb-2.5 flex items-center gap-2">
                        <AlertTriangle size={17} className="text-[#b3730a]"/>
                        <h2 className="m-0 text-[14px] font-semibold text-[#7a5407]">
                            {t("poaRegistryPage.expiringTitle", {days: EXPIRING_DAYS, total: expiring.length})
                                /* Истекают в ближайшие N дней — M */}
                        </h2>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {expiring.slice(0, 8).map((poa) => (
                            <button
                                key={poa.id}
                                type="button"
                                onClick={() => setOpened(poa.id)}
                                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[9px]
                                           border border-[#e7dcc4] bg-white px-3 py-2 text-left cursor-pointer
                                           transition hover:border-[#b3730a]"
                            >
                                <span className="font-mono text-[12px] text-[#8b97ab]">
                                    {poa.regNumber ?? noNumber}
                                </span>
                                <span className="text-[13.5px] font-medium text-[#1c2740]">
                                    {poa.holderName}
                                </span>
                                <span className="text-[12.5px] text-[#8b97ab]">
                                    {poa.holderUnit ?? poa.holderPosition ?? ""}
                                </span>
                                <span className="ml-auto text-[12.5px] font-medium text-[#b3730a]">
                                    {t("poaRegistryPage.until", {date: formatDate(poa.validTo)}) /* до … */}
                                    {" · "}{formatDaysLeft(daysUntil(poa.validTo), t)}
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <Tabs<PoaStatus | "">
                className=""
                tabs={[
                    {id: "", label: t("poaRegistryPage.statusAll") /* Все */},
                    ...POA_STATUS_ORDER.map((value) => ({
                        id: value,
                        label: t(`poaRegistryPage.statuses.${value}`),
                    })),
                ]}
                value={status}
                onChange={setStatus}
            />

            <SearchBar
                variant="gray"
                value={text}
                onChange={setText}
                onSubmit={() => void load()}
                placeholder={t("poaRegistryPage.searchPlaceholder") /* ФИО, номер или фраза из полномочий */}
            />

            {loading ? (
                <Loader label={t("poaRegistryPage.loading") /* Загружаем реестр… */}/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title={t("poaRegistryPage.emptyTitle") /* Доверенностей нет */}
                    description={status
                        ? t("poaRegistryPage.emptyForStatus") /* По выбранному состоянию ничего не нашлось. */
                        : t("poaRegistryPage.emptyRegistry") /* Реестр пуст. */}
                />
            ) : (
                <DataTable
                    headers={[
                        t("poaRegistryPage.columns.number"), /* Номер */
                        t("poaRegistryPage.columns.holder"), /* Кому */
                        t("poaRegistryPage.columns.unit"), /* Подразделение */
                        t("poaRegistryPage.columns.powers"), /* Полномочия */
                        t("poaRegistryPage.columns.period"), /* Срок */
                        t("poaRegistryPage.columns.status"), /* Состояние */
                    ]}
                >
                    {rows.map((poa) => {
                        const days = daysUntil(poa.validTo);
                        const soon = poa.status === "Active" && days <= EXPIRING_DAYS;

                        return (
                            <Row key={poa.id} onClick={() => setOpened(poa.id)} alert={soon && days < 0}>
                                <Cell mono>
                                    {poa.regNumber
                                        ? <HighlightText text={poa.regNumber} query={appliedText}/>
                                        : noNumber}
                                </Cell>
                                <Cell strong>
                                    <HighlightText text={poa.holderName} query={appliedText}/>
                                    {poa.parentRegNumber && (
                                        <span className="ml-2 font-mono text-[11px] font-normal text-[#8b97ab]">
                                            {t("poaRegistryPage.subDelegation", {number: poa.parentRegNumber})
                                                /* передоверие по … */}
                                        </span>
                                    )}
                                </Cell>
                                <Cell>{poa.holderUnit ?? poa.holderPosition ?? "—"}</Cell>
                                <Cell className="max-w-[380px]">
                                    <span className="line-clamp-2">
                                        <HighlightText text={poa.powers} query={appliedText}/>
                                    </span>
                                    {poa.amountLimit !== null && (
                                        <span className="mt-0.5 block font-mono text-[11.5px] text-[#8b97ab]">
                                            {t("poaRegistryPage.amountLimit", {
                                                amount: poa.amountLimit.toLocaleString("ru-RU"),
                                                currency: poa.amountCurrency,
                                            }) /* до … */}
                                        </span>
                                    )}
                                </Cell>
                                <Cell mono>
                                    {formatDate(poa.validFrom)} — {formatDate(poa.validTo)}
                                    {soon && (
                                        <span className="mt-0.5 block text-[11.5px] font-semibold text-[#b3730a]">
                                            {formatDaysLeft(days, t)}
                                        </span>
                                    )}
                                </Cell>
                                <Cell nowrap>
                                    <Badge tone={STATUS_TONE[poa.status]}>
                                        {t(`poaRegistryPage.statuses.${poa.status}`)}
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
