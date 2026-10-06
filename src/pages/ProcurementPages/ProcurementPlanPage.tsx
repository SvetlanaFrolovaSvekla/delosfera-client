/**
 * Годовой План закупок и отчёт об исполнении (PRC-22, приложение №5).
 *
 * Факт по позиции считает сервер из заявок, сославшихся на её номер, поэтому
 * отчёт всегда сходится с реестром закупок, а не ведётся отдельно.
 */
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ShieldCheck} from "lucide-react";
import {planService, type Plan} from "@/service/procurementService/planService.ts";
import {organizationUnitService} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import type {TreeSelectOption} from "@/components/componentsGeneral/selects/SingleSelects/TreeSingleSelectModal.tsx";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";

function money(value: number): string {
    return value.toLocaleString("ru-RU");
}

export const ProcurementPlanPage = () => {
    const {t, i18n} = useTranslation();
    const currentYear = new Date().getFullYear();

    const [year, setYear] = useState(currentYear);
    const [years, setYears] = useState<number[]>([]);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({code: "", subject: "", amount: 0, quarter: "", unitId: ""});

    // Окно утверждения плана: протокол Правления вводится здесь, а не в window.prompt
    const [approveOpen, setApproveOpen] = useState(false);
    const [protocolInput, setProtocolInput] = useState("");
    const [approveError, setApproveError] = useState<string | null>(null);

    // Подразделения для модального выбора — деревом, название по языку интерфейса
    const unitOptions = useMemo<TreeSelectOption[]>(() => units.map(u => ({
        key: String(u.id),
        label: (i18n.language === "en" ? u.titleEn : i18n.language === "kg" ? u.titleKg : null) || u.titleRu,
        parentId: u.parentId != null ? String(u.parentId) : undefined,
    })), [units, i18n.language]);

    const quarterOptions = useMemo<TreeSelectOption[]>(() => [1, 2, 3, 4].map(q => ({
        key: String(q),
        label: t("procurementPlan.quarterValue", {n: q}),
    })), [t]);

    const load = useCallback(async () => {
        try {
            setPlan(await planService.get(year));
        } catch {
            // setError("Не удалось загрузить план закупок");
            setError(t("procurementPlan.loadError"));
        }
    }, [year, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        planService.years().then(setYears).catch(() => undefined);
        organizationUnitService.getAll().then(setUnits).catch(() => undefined);
    }, [plan?.id]);

    const run = async (action: () => Promise<Plan>) => {
        try {
            setBusy(true);
            setError(null);
            setPlan(await action());
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            // setError(message ?? "Операция не выполнена");
            setError(message ?? t("procurementPlan.operationFailed"));
        } finally {
            setBusy(false);
        }
    };

    const openApprove = () => {
        setProtocolInput("");
        setApproveError(null);
        setApproveOpen(true);
    };

    // const approve = () => {
    //     if (!plan) return;
    //     const protocol = window.prompt("Протокол Правления, которым утверждён план:");
    //     if (!protocol?.trim()) return;
    //     return run(() => planService.approve(plan.id, protocol.trim()));
    // };
    const confirmApprove = async () => {
        if (!plan) return;
        const protocol = protocolInput.trim();
        if (!protocol) {
            setApproveError(t("procurementPlan.approve.protocolRequired"));
            return;
        }
        try {
            setBusy(true);
            setApproveError(null);
            setPlan(await planService.approve(plan.id, protocol));
            setApproveOpen(false);
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setApproveError(message ?? t("procurementPlan.operationFailed"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 16}}>
            <div style={{display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap"}}>
                <div style={{flex: 1}}>
                    <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                        {/* План закупок */}
                        {t("procurementPlan.title")}
                    </h1>
                    <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                        {/* Приложение №5 к Положению · отчёт об исполнении считается из заявок года */}
                        {t("procurementPlan.subtitle")}
                    </div>
                </div>

                <SelectDropdown
                    options={[...new Set([currentYear, currentYear + 1, ...years])]
                        .sort((a, b) => b - a)
                        .map(y => ({value: String(y), label: String(y)}))}
                    value={String(year)}
                    onChange={(v) => setYear(Number(v))}
                    minWidth="120px"
                />

                {plan?.status === "Draft" && (
                    <button
                        onClick={openApprove}
                        disabled={busy}
                        className="cursor-pointer inline-flex h-[42px] items-center gap-2 rounded-[11px] bg-[#2f68f5] px-[18px] text-[13.5px] font-semibold text-white shadow-[0_6px_16px_-6px_#2f68f5] hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none">
                        {/* Утвердить план */}
                        {t("procurementPlan.approve.button")}
                    </button>
                )}
            </div>

            {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

            {!plan ? (
                <section style={card}>
                    <div style={{fontSize: 13, color: "#55617a", lineHeight: 1.7}}>
                        {/* План закупок на {year} год не заведён. Заявки без позиции плана считаются
                        внеплановыми и идут по отдельной ветке согласования (PRC-03). */}
                        {t("procurementPlan.notCreated", {year})}
                    </div>
                    <button
                        onClick={() => run(() => planService.create(year))}
                        disabled={busy}
                        style={{...primaryButton, marginTop: 12}}
                    >
                        {/* Завести план на {year} год */}
                        {t("procurementPlan.create", {year})}
                    </button>
                </section>
            ) : (
                <>
                    <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12}}>
                        <Tile label={t("procurementPlan.tiles.status") /* "Статус" */} value={plan.statusTitle}
                              note={plan.approvalProtocol ?? undefined}/>
                        <Tile label={t("procurementPlan.tiles.planned") /* "Плановая сумма" */} value={`${money(plan.plannedTotal)} ${t("procurementPlan.som")}`}/>
                        <Tile label={t("procurementPlan.tiles.actual") /* "Фактически по заявкам" */} value={`${money(plan.actualTotal)} ${t("procurementPlan.som")}`}/>
                        <Tile
                            // label="Законтрактовано"
                            label={t("procurementPlan.tiles.contracted")}
                            value={`${money(plan.contractedTotal)} ${t("procurementPlan.som")}`}
                            note={plan.plannedTotal > 0
                                // ? `${Math.round(...)}% плана`
                                ? t("procurementPlan.tiles.ofPlan", {percent: Math.round((plan.contractedTotal / plan.plannedTotal) * 100)})
                                : undefined}
                        />
                        <Tile
                            // label="Внеплановые закупки"
                            label={t("procurementPlan.tiles.unplanned")}
                            // value={`${plan.unplannedRequestCount} шт.`}
                            value={t("procurementPlan.tiles.pieces", {count: plan.unplannedRequestCount})}
                            // note={plan.unplannedAmount > 0 ? `на ${money(plan.unplannedAmount)} сом` : undefined}
                            note={plan.unplannedAmount > 0
                                ? t("procurementPlan.tiles.forAmount", {amount: money(plan.unplannedAmount)})
                                : undefined}
                            danger={plan.unplannedRequestCount > 0}
                        />
                    </div>

                    <section style={{...card, padding: 0, overflow: "hidden"}}>
                        <div style={{overflowX: "auto"}}>
                            <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                                <thead>
                                    <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                                        <th style={th}>
                                            {/* Позиция */}
                                            {t("procurementPlan.cols.item")}
                                        </th>
                                        <th style={th}>
                                            {/* Предмет закупки */}
                                            {t("procurementPlan.cols.subject")}
                                        </th>
                                        <th style={th}>
                                            {/* Подразделение */}
                                            {t("procurementPlan.cols.unit")}
                                        </th>
                                        <th style={th}>
                                            {/* Кв. */}
                                            {t("procurementPlan.cols.quarter")}
                                        </th>
                                        <th style={{...th, textAlign: "right"}}>
                                            {/* План */}
                                            {t("procurementPlan.cols.plan")}
                                        </th>
                                        <th style={{...th, textAlign: "right"}}>
                                            {/* Факт */}
                                            {t("procurementPlan.cols.fact")}
                                        </th>
                                        <th style={{...th, textAlign: "right"}}>
                                            {/* Законтрактовано */}
                                            {t("procurementPlan.cols.contracted")}
                                        </th>
                                        <th style={{...th, textAlign: "right"}}>
                                            {/* Отклонение */}
                                            {t("procurementPlan.cols.deviation")}
                                        </th>
                                        <th style={th}/>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plan.items.map(i => (
                                        <tr key={i.id} style={{
                                            borderTop: "1px solid #eef2f7",
                                            background: i.isOverrun ? "#fdf6f5" : undefined,
                                        }}>
                                            <td style={{...td, fontWeight: 600}}>{i.code}</td>
                                            <td style={td}>
                                                {i.subject}
                                                <div style={{fontSize: 11, color: "#8b97ab"}}>{i.subjectKindTitle}</div>
                                            </td>
                                            <td style={td}>{i.orgUnitTitle ?? "—"}</td>
                                            <td style={td}>{i.quarter ?? "—"}</td>
                                            <td style={{...td, textAlign: "right", whiteSpace: "nowrap"}}>{money(i.plannedAmount)}</td>
                                            <td style={{...td, textAlign: "right", whiteSpace: "nowrap"}}>
                                                {money(i.actualAmount)}
                                                <div style={{fontSize: 11, color: "#8b97ab"}}>{/* {i.requestCount} заявок */}
                                                {t("procurementPlan.requestsCount", {count: i.requestCount})}
                                                </div>
                                            </td>
                                            <td style={{...td, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600}}>
                                                {money(i.contractedAmount)}
                                            </td>
                                            <td style={{
                                                ...td, textAlign: "right", whiteSpace: "nowrap",
                                                color: i.isOverrun ? "#c0392b" : "#55617a",
                                            }}>
                                                {i.deviationPercent === null
                                                    ? "—"
                                                    : `${i.deviationPercent > 0 ? "+" : ""}${i.deviationPercent}%`}
                                            </td>
                                            <td style={td}>
                                                {plan.status === "Draft" && i.requestCount === 0 && (
                                                    <button onClick={() => run(() => planService.removeItem(i.id))}
                                                            disabled={busy} style={linkButton}>
                                                        {/* исключить */}
                                                        {t("procurementPlan.exclude")}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {plan.items.length === 0 && (
                            <div style={{padding: 24, textAlign: "center", color: "#8b97ab", fontSize: 13}}>
                                {/* Позиций пока нет */}
                                {t("procurementPlan.noItems")}
                            </div>
                        )}
                    </section>

                    {plan.status === "Draft" && (
                        <section style={card}>
                            <div style={cardTitle}>
                                {/* Добавить позицию */}
                                {t("procurementPlan.add.title")}
                            </div>
                            <div style={{display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end"}}>
                                <FormField label={t("procurementPlan.add.code")} width={180}>
                                    <input value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                                           /* placeholder="№ позиции, напр. п. 4.2" */
                                           placeholder={t("procurementPlan.add.codePlaceholder")}
                                           style={{...input, width: "100%"}}/>
                                </FormField>
                                <FormField label={t("procurementPlan.add.subject")} flex>
                                    <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                                           /* placeholder="Предмет закупки" */
                                           placeholder={t("procurementPlan.add.subjectPlaceholder")}
                                           style={{...input, width: "100%"}}/>
                                </FormField>
                                <FormField label={t("procurementPlan.add.amount")} width={160}>
                                    <input type="number" value={form.amount || ""}
                                           onChange={e => setForm({...form, amount: Number(e.target.value) || 0})}
                                           /* placeholder="Плановая сумма" */
                                           placeholder={t("procurementPlan.add.amountPlaceholder")}
                                           style={{...input, width: "100%"}}/>
                                </FormField>

                                {/* Подразделение и квартал выбираются в модальных окнах */}
                                <div style={{width: 240}}>
                                    <SingleSelectListField
                                        label={t("procurementPlan.add.unit")}
                                        boldLabel={false}
                                        modalTitle={t("procurementPlan.add.unitModalTitle")}
                                        options={unitOptions}
                                        selectedKey={form.unitId || null}
                                        onChange={(key) => setForm({...form, unitId: key ?? ""})}
                                        /* placeholder="— подразделение —" */
                                        placeholder={t("procurementPlan.add.unitPlaceholder")}
                                        searchPlaceholder={t("procurementPlan.add.unitSearch")}
                                        clearLabel={t("procurementPlan.add.clearChoice")}
                                    />
                                </div>
                                <div style={{width: 150}}>
                                    <SingleSelectListField
                                        label={t("procurementPlan.add.quarter")}
                                        boldLabel={false}
                                        modalTitle={t("procurementPlan.add.quarterModalTitle")}
                                        options={quarterOptions}
                                        selectedKey={form.quarter || null}
                                        onChange={(key) => setForm({...form, quarter: key ?? ""})}
                                        /* placeholder="квартал" */
                                        placeholder={t("procurementPlan.add.quarterPlaceholder")}
                                        clearLabel={t("procurementPlan.add.clearChoice")}
                                    />
                                </div>

                                <button
                                    onClick={() => run(() => planService.addItem(plan.id, {
                                        code: form.code.trim(),
                                        subject: form.subject.trim(),
                                        plannedAmount: form.amount,
                                        quarter: form.quarter ? Number(form.quarter) : undefined,
                                        orgUnitId: form.unitId ? Number(form.unitId) : undefined,
                                    })).then(() => setForm({code: "", subject: "", amount: 0, quarter: "", unitId: ""}))}
                                    disabled={busy || !form.code.trim() || !form.subject.trim() || form.amount <= 0}
                                    style={{...secondaryButton, height: 40}}
                                >
                                    {/* Добавить */}
                                    {t("procurementPlan.add.submit")}
                                </button>
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* Окно утверждения плана (вместо window.prompt) */}
            <ConfirmActionModal
                open={approveOpen}
                onClose={() => setApproveOpen(false)}
                onConfirm={() => void confirmApprove()}
                title={t("procurementPlan.approve.title", {year})}
                message={t("procurementPlan.approve.message")}
                confirmLabel={t("procurementPlan.approve.confirm")}
                loadingLabel={t("procurementPlan.approve.loading")}
                loading={busy}
                error={approveError}
                variant="primary"
                icon={ShieldCheck}
            >
                <label style={{display: "block", fontSize: 11.5, color: "#8b97ab", marginBottom: 5}}>
                    {/* Протокол Правления */}
                    {t("procurementPlan.approve.protocolLabel")}
                </label>
                <input
                    autoFocus
                    value={protocolInput}
                    onChange={e => {
                        setProtocolInput(e.target.value);
                        setApproveError(null);
                    }}
                    onKeyDown={e => {
                        if (e.key === "Enter") void confirmApprove();
                    }}
                    placeholder={t("procurementPlan.approve.protocolPlaceholder")}
                    style={{...input, width: "100%", height: 40, boxSizing: "border-box"}}
                />
            </ConfirmActionModal>
        </div>
    );
};

const FormField = ({label, width, flex, children}: {
    label: string; width?: number; flex?: boolean; children: React.ReactNode;
}) => (
    <div style={flex ? {flex: 1, minWidth: 200} : {width}}>
        <span style={{display: "block", fontSize: 11.5, color: "#8b97ab", marginBottom: 5}}>{label}</span>
        {children}
    </div>
);

const Tile = ({label, value, note, danger}: { label: string; value: string; note?: string; danger?: boolean }) => (
    <div style={{
        padding: "12px 14px", borderRadius: 12,
        background: danger ? "#fdf6f5" : "#fff",
        border: `1px solid ${danger ? "#f3c9c2" : "#e5e9f0"}`,
    }}>
        <div style={{fontSize: 11.5, color: "#8b97ab"}}>{label}</div>
        <div style={{marginTop: 4, fontSize: 17, fontWeight: 700, color: danger ? "#c0392b" : "#0f1b2d"}}>{value}</div>
        {note && <div style={{marginTop: 2, fontSize: 11.5, color: "#8b97ab"}}>{note}</div>}
    </div>
);

const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e9f0", borderRadius: 13, padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab",
    textTransform: "uppercase", marginBottom: 10,
};

const input: React.CSSProperties = {
    height: 40, padding: "0 11px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", font: "inherit", fontSize: 12.5, outline: "none",
};

const primaryButton: React.CSSProperties = {
    height: 36, padding: "0 15px", border: "none", borderRadius: 9,
    background: "#2f68f5", color: "#fff", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
    height: 36, padding: "0 14px", border: "1px solid #e5e9f0", borderRadius: 9,
    background: "#fff", color: "#55617a", font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
};

const linkButton: React.CSSProperties = {
    border: "none", background: "none", color: "#8b97ab", font: "inherit", fontSize: 12, cursor: "pointer",
};

const th: React.CSSProperties = {padding: "10px 12px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "10px 12px", verticalAlign: "top", color: "#26324a"};
