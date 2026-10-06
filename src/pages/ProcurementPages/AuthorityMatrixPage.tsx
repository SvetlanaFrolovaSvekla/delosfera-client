/**
 * Матрица полномочий по закупкам (PRC-02/04/05) — экран v8 «Матрица полномочий».
 * Слева пользователь задаёт параметры сделки, справа система показывает применимый
 * способ закупки с составом согласования; ниже — приложение №1 Положения целиком,
 * где подсвечена сработавшая строка. Пороги считает сервер, экран их только показывает.
 */
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import type {TFunction} from "i18next";
import {
    authorityMatrixService,
    type ApprovalAuthority,
    type MatrixResolveResult,
    type MatrixRule,
    type MatrixTable,
} from "@/service/procurementService/authorityMatrixService.ts";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {MatrixNotesList} from "@/components/procurement/MatrixNotesList.tsx";
import {colors} from "@/design/tokens";

/** Быстрый выбор суммы — те же точки, что и в дизайне: рядом с порогами Положения. */
const AMOUNT_PRESETS = [
    {labelKey: "authorityMatrixPage.presets.k50", value: 50_000},       // "50 тыс"
    {labelKey: "authorityMatrixPage.presets.k300", value: 300_000},     // "300 тыс"
    {labelKey: "authorityMatrixPage.presets.k500", value: 500_000},     // "500 тыс"
    {labelKey: "authorityMatrixPage.presets.m3", value: 3_000_000},     // "3 млн"
    {labelKey: "authorityMatrixPage.presets.m12", value: 12_000_000},   // "12 млн"
];

const METHOD_FILTERS = [
    {id: "", labelKey: "authorityMatrixPage.methodFilters.auto"},              // "Определяет матрица"
    {id: "Simple", labelKey: "authorityMatrixPage.methodFilters.simple"},      // "Простая закупка"
    {id: "Direct", labelKey: "authorityMatrixPage.methodFilters.direct"},      // "Прямое заключение"
    {id: "TenderOpen", labelKey: "authorityMatrixPage.methodFilters.tenderOpen"}, // "Конкурс"
];

function money(value: number | null, t: TFunction): string {
    if (value === null) return "—";
    // return `${value.toLocaleString("ru-RU")} сом`;
    return `${value.toLocaleString("ru-RU")} ${t("authorityMatrixPage.units.som")}`;
}

/** Крупные суммы в таблице читаются плохо — сокращаем до млн/млрд. */
function shortMoney(value: number | null, t: TFunction): string {
    if (value === null) return "—";
    // `... млрд`
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(".0", "")} ${t("authorityMatrixPage.units.billion")}`;
    // `... млн`
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")} ${t("authorityMatrixPage.units.million")}`;
    return value.toLocaleString("ru-RU");
}

/** Цвет результата: чем выше орган утверждения, тем «тяжелее» закупка. */
function toneByAuthority(authority: ApprovalAuthority): { fg: string; bg: string } {
    switch (authority) {
        case "Shareholders":
            return colors.status.arch;
        case "SupervisoryBoard":
            return colors.status.onact;
        case "Board":
            return colors.status.review;
        default:
            return colors.status.active;
    }
}

export const AuthorityMatrixPage = () => {
    const {t} = useTranslation();
    const [table, setTable] = useState<MatrixTable | null>(null);
    const [result, setResult] = useState<MatrixResolveResult | null>(null);

    const [amount, setAmount] = useState(300_000);
    const [isAffiliated, setIsAffiliated] = useState(false);
    const [method, setMethod] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authorityMatrixService
            .table()
            .then(setTable)
            // .catch(() => setError("Не удалось загрузить матрицу полномочий"))
            .catch(() => setError(t("authorityMatrixPage.loadError")))
            .finally(() => setLoading(false));
    }, [t]);

    const resolve = useCallback(async () => {
        try {
            setError(null);
            setResult(await authorityMatrixService.resolve({
                amount,
                isAffiliated,
                preferredMethod: method || undefined,
            }));
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            // setError(message ?? "Не удалось подобрать способ закупки");
            setError(message ?? t("authorityMatrixPage.resolveError"));
            setResult(null);
        }
    }, [amount, isAffiliated, method, t]);

    // Пересчёт идёт на каждое изменение параметров: экран задуман как калькулятор,
    // а не как форма с кнопкой «Рассчитать».
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void resolve();
    }, [resolve]);

    const rows = useMemo<MatrixRule[]>(
        () => (isAffiliated ? table?.affiliated : table?.regular) ?? [],
        [table, isAffiliated],
    );

    const tone = result ? toneByAuthority(result.approvalAuthority) : colors.status.draft;

    if (loading) return <div style={{padding: 24, color: "#8b97ab"}}>
        {/* Загрузка матрицы… */}
        {t("authorityMatrixPage.loading")}
    </div>;

    return (
        <div style={{padding: "22px 26px", display: "flex", flexDirection: "column", gap: 18}}>
            <div>
                <h1 style={{margin: 0, fontSize: 19, fontWeight: 700, color: "#0f1b2d"}}>
                    {/* Матрица полномочий по закупкам */}
                    {t("authorityMatrixPage.title")}
                </h1>
                <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                    {/* Приложение №1 к Положению о закупках · пороги пересчитываются от баланса и ЧСК */}
                    {t("authorityMatrixPage.subtitle")}
                </div>
            </div>

            <div style={{display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: 18, alignItems: "start"}}>
                {/* --- параметры сделки --- */}
                <section style={card}>
                    <div style={cardTitle}>
                        {/* Параметры закупки */}
                        {t("authorityMatrixPage.paramsTitle")}
                    </div>

                    <label style={fieldLabel}>
                        {/* Сумма закупки */}
                        {t("authorityMatrixPage.amountLabel")}
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={amount}
                        onChange={e => setAmount(Number(e.target.value) || 0)}
                        style={input}
                    />

                    <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8}}>
                        {AMOUNT_PRESETS.map(p => (
                            <button
                                key={p.value}
                                onClick={() => setAmount(p.value)}
                                style={{
                                    ...chip,
                                    background: amount === p.value ? "#eef3ff" : "#f6f8fb",
                                    borderColor: amount === p.value ? "#2f68f5" : "#e5e9f0",
                                    color: amount === p.value ? "#2f68f5" : "#55617a",
                                }}
                            >
                                {t(p.labelKey)}
                            </button>
                        ))}
                    </div>

                    <label style={{...fieldLabel, marginTop: 16}}>
                        {/* Способ закупки */}
                        {t("authorityMatrixPage.methodLabel")}
                    </label>
                    <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
                        {METHOD_FILTERS.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMethod(m.id)}
                                style={{
                                    ...chip,
                                    background: method === m.id ? "#eef3ff" : "#f6f8fb",
                                    borderColor: method === m.id ? "#2f68f5" : "#e5e9f0",
                                    color: method === m.id ? "#2f68f5" : "#55617a",
                                }}
                            >
                                {t(m.labelKey)}
                            </button>
                        ))}
                    </div>

                    <div style={{marginTop: 16}}>
                        <CheckBoxOne
                            checked={isAffiliated}
                            onChange={setIsAffiliated}
                            tone="brand"
                            className="!h-auto w-full !py-2.5 !justify-start text-left !bg-[#f6f8fb]"
                        >
                            <span style={{flex: 1}}>
                                <span style={{display: "block", fontSize: 13, fontWeight: 600, color: "#26324a"}}>
                                    {/* Сделка с аффилированным лицом */}
                                    {t("authorityMatrixPage.affiliatedTitle")}
                                </span>
                                <span style={{display: "block", fontSize: 11.5, fontWeight: 400, color: "#8b97ab"}}>
                                    {/* Переключает шкалу порогов на проценты ЧСК */}
                                    {t("authorityMatrixPage.affiliatedHint")}
                                </span>
                            </span>
                        </CheckBoxOne>
                    </div>

                    {table && (
                        <div style={{marginTop: 14, fontSize: 11.5, color: "#8b97ab", lineHeight: 1.6}}>
                            {/* Балансовая стоимость активов ≈ {shortMoney(table.balanceAssets)} сом */}
                            {t("authorityMatrixPage.assets", {value: shortMoney(table.balanceAssets, t)})}<br/>
                            {/* ЧСК ≈ {shortMoney(table.nsk)} сом · порог протокола {money(table.protocolThreshold)} */}
                            {t("authorityMatrixPage.equity", {
                                value: shortMoney(table.nsk, t),
                                threshold: money(table.protocolThreshold, t),
                            })}
                        </div>
                    )}
                </section>

                {/* --- результат подбора --- */}
                <section style={{...card, borderColor: result ? tone.fg : "#e5e9f0"}}>
                    {error && <div style={{color: "#e0483d", fontSize: 13}}>{error}</div>}

                    {result && (
                        <>
                            <div style={{fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#8b97ab", textTransform: "uppercase"}}>
                                {/* Применяемый способ */}
                                {t("authorityMatrixPage.appliedMethod")}
                            </div>
                            <div style={{marginTop: 6, fontSize: 22, fontWeight: 700, color: tone.fg}}>
                                {result.methodTitle}
                            </div>
                            {result.alternativeMethodTitle && (
                                <div style={{marginTop: 4, fontSize: 12.5, color: "#8b97ab"}}>
                                    {/* Допустим также: {result.alternativeMethodTitle} */}
                                    {t("authorityMatrixPage.alsoAllowed", {title: result.alternativeMethodTitle})}
                                </div>
                            )}

                            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginTop: 16}}>
                                {result.facts.map(f => (
                                    <div
                                        key={f.key}
                                        style={{
                                            padding: "10px 12px", borderRadius: 10,
                                            background: f.isHighlighted ? tone.bg : "#f6f8fb",
                                        }}
                                    >
                                        <div style={{fontSize: 11, color: "#8b97ab"}}>{f.key}</div>
                                        <div style={{
                                            marginTop: 3, fontSize: 13.5, fontWeight: 600,
                                            color: f.isHighlighted ? tone.fg : "#26324a",
                                        }}>
                                            {f.value}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8}}>
                                <span style={{...badge, color: tone.fg, background: tone.bg}}>
                                    {/* Утверждает: {result.approvalAuthorityTitle} */}
                                    {t("authorityMatrixPage.approvedBy", {title: result.approvalAuthorityTitle})}
                                </span>
                                {result.commissionRequired && (
                                    <span style={{...badge, color: "#55617a", background: "#f2f5f9"}}>
                                        {/* Комиссия: {result.commissionSize ?? "—"} чл. */}
                                        {t("authorityMatrixPage.commission", {size: result.commissionSize ?? "—"})}
                                        {/* `, из них ЧП ≥ ${result.commissionMinBoardMembers}` */}
                                        {result.commissionMinBoardMembers
                                            ? t("authorityMatrixPage.commissionBoard", {count: result.commissionMinBoardMembers})
                                            : ""}
                                    </span>
                                )}
                                {result.protocolRequired && (
                                    <span style={{...badge, color: "#55617a", background: "#f2f5f9"}}>
                                        {/* Требуется протокол */}
                                        {t("authorityMatrixPage.protocolRequired")}
                                    </span>
                                )}
                                {result.minProposals > 0 && (
                                    <span style={{...badge, color: "#55617a", background: "#f2f5f9"}}>
                                        {/* КП не менее {result.minProposals} */}
                                        {t("authorityMatrixPage.minProposals", {count: result.minProposals})}
                                    </span>
                                )}
                            </div>

                            {result.notes.length > 0 && (
                                <MatrixNotesList
                                    notes={result.notes}
                                    className="mt-3.5 pl-[18px] text-[12.5px] leading-[1.7] text-[#55617a]"
                                />
                            )}
                        </>
                    )}
                </section>
            </div>

            {/* --- приложение №1 целиком --- */}
            <section style={{...card, padding: 0, overflow: "hidden"}}>
                <div style={{padding: "14px 16px", borderBottom: "1px solid #eef2f7"}}>
                    <div style={{fontWeight: 600, fontSize: 14, color: "#0f1b2d"}}>
                        {/* Приложение №1 · полная матрица полномочий */}
                        {t("authorityMatrixPage.annexTitle")}
                    </div>
                    <div style={{marginTop: 3, fontSize: 11.5, color: "#8b97ab"}}>
                        {/* Подсвечена строка, соответствующая заданной сумме и типу сделки */}
                        {t("authorityMatrixPage.annexHint")}
                    </div>
                </div>

                <div style={{overflowX: "auto"}}>
                    <table style={{width: "100%", borderCollapse: "collapse", fontSize: 12.5}}>
                        <thead>
                            <tr style={{background: "#f6f8fb", color: "#55617a", textAlign: "left"}}>
                                <th style={th}>
                                    {/* Способ */}
                                    {t("authorityMatrixPage.cols.method")}
                                </th>
                                <th style={th}>
                                    {/* Диапазон суммы */}
                                    {t("authorityMatrixPage.cols.range")}
                                </th>
                                <th style={th}>
                                    {/* Согласование закупки */}
                                    {t("authorityMatrixPage.cols.chain")}
                                </th>
                                <th style={th}>
                                    {/* Комиссия */}
                                    {t("authorityMatrixPage.cols.commission")}
                                </th>
                                <th style={th}>
                                    {/* Утверждение расхода */}
                                    {t("authorityMatrixPage.cols.approval")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                const active = result?.ruleId === r.id;
                                return (
                                    <tr
                                        key={r.id}
                                        style={{
                                            borderTop: "1px solid #eef2f7",
                                            background: active ? tone.bg : undefined,
                                        }}
                                    >
                                        <td style={{...td, fontWeight: active ? 700 : 500, color: active ? tone.fg : "#26324a"}}>
                                            {r.methodTitle}
                                        </td>
                                        <td style={td}>
                                            {r.rangeTitle}
                                            <div style={{fontSize: 11, color: "#8b97ab"}}>
                                                {/* и свыше */}
                                                {shortMoney(r.minAmount, t)} — {r.maxAmount === null ? t("authorityMatrixPage.andAbove") : shortMoney(r.maxAmount, t)}
                                            </div>
                                        </td>
                                        <td style={td}>{r.approvalChain}</td>
                                        <td style={{...td, color: "#55617a"}}>{r.commissionNote}</td>
                                        <td style={td}>{r.approvalAuthorityTitle}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

const card: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e5e9f0",
    borderRadius: 13,
    padding: 16,
};

const cardTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: ".06em",
    color: "#8b97ab",
    textTransform: "uppercase",
    marginBottom: 12,
};

const fieldLabel: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: "#55617a",
    marginBottom: 6,
};

const input: React.CSSProperties = {
    width: "100%",
    height: 38,
    padding: "0 12px",
    border: "1px solid #e5e9f0",
    borderRadius: 10,
    background: "#f6f8fb",
    font: "inherit",
    fontSize: 13,
    color: "#0f1b2d",
    outline: "none",
};

const chip: React.CSSProperties = {
    padding: "6px 11px",
    borderRadius: 8,
    border: "1px solid #e5e9f0",
    font: "inherit",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
};

const badge: React.CSSProperties = {
    padding: "5px 10px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 600,
};

const th: React.CSSProperties = {padding: "10px 14px", fontWeight: 600, whiteSpace: "nowrap"};
const td: React.CSSProperties = {padding: "10px 14px", verticalAlign: "top", color: "#26324a"};
