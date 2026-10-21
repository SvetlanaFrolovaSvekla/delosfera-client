/**
 * Справочник Настройка Матрицы полномочий: пороги сумм, минимум КП и состав согласования.
 *
 * Раньше эти значения жили только в коде и правились сборкой — сектор закупок
 * просил менять их сам по Положению. Здесь способ задаёт, сколько КП минимум, а
 * правило — при какой сумме кто согласует и нужна ли комиссия.
 */
import {useCallback, useEffect, useMemo, useState, type ReactNode} from "react";
import {ArrowLeft, Check, Plus, Save, Scale, Trash2, Users, Layers, ShieldCheck} from "lucide-react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import type {TFunction} from "i18next";

import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {
    authorityMatrixService,
    type MatrixRuleEdit, type MatrixRuleSave,
    type ProcurementMethodEdit, type ThresholdBase, type ApprovalAuthority,
} from "@/service/procurementService/authorityMatrixService.ts";
import {CheckBoxOne} from "@/components/componentsGeneral/componentsCheckBox/CheckBoxOne.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/emptyPanel/EmptyState.tsx";


const LABEL = "text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd]";

const INPUT = "h-9 w-full px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#1c2740] " +
    "outline-none transition-colors focus:border-[#2f68f5] focus:ring-2 focus:ring-[#cbddff] " +
    "disabled:bg-[#f6f8fb] disabled:text-[#8b97ab]";

const BASES: { value: ThresholdBase; labelKey: string }[] = [
    {value: "Absolute", labelKey: "authorityMatrixSettingsPage.bases.absolute"},
    {value: "PercentOfAssets", labelKey: "authorityMatrixSettingsPage.bases.percentOfAssets"},
    {value: "PercentOfEquity", labelKey: "authorityMatrixSettingsPage.bases.percentOfEquity"},
];

const AUTHORITIES: { value: ApprovalAuthority; labelKey: string }[] = [
    {value: "None", labelKey: "authorityMatrixSettingsPage.authorities.none"},
    {value: "Curator", labelKey: "authorityMatrixSettingsPage.authorities.curator"},
    {value: "Board", labelKey: "authorityMatrixSettingsPage.authorities.board"},
    {value: "SupervisoryBoard", labelKey: "authorityMatrixSettingsPage.authorities.supervisoryBoard"},
    {value: "Shareholders", labelKey: "authorityMatrixSettingsPage.authorities.shareholders"},
];

/** The higher the approving body, the "heavier" the procurement: the card accent follows it. */
const AUTHORITY_TONE: Record<ApprovalAuthority, { fg: string; bg: string }> = {
    None: {fg: "#8b97ab", bg: "#f2f5f9"},
    Curator: {fg: "#2f68f5", bg: "#eef3ff"},
    Board: {fg: "#4e57d6", bg: "#eef0fd"},
    SupervisoryBoard: {fg: "#b7791f", bg: "#fdf6e7"},
    Shareholders: {fg: "#c0392b", bg: "#fdf1f1"},
};

export function AuthorityMatrixSettingsPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canEdit = hasPermission(PermissionCode.ManageProcurementDictionaries);

    const [methods, setMethods] = useState<ProcurementMethodEdit[]>([]);
    const [rules, setRules] = useState<MatrixRuleEdit[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const [m, r] = await Promise.all([
                authorityMatrixService.methods(),
                authorityMatrixService.rules(),
            ]);
            setMethods(m);
            setRules(r);
            setLoadError(false);
            setError(null);
        } catch {
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const run = async (action: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await action();
            await load();
            setError(null);
        } catch (e) {
            setError(extractMessage(e) ?? t("authorityMatrixSettingsPage.saveError"));
        } finally {
            setBusy(false);
        }
    };

    const addRule = () => run(() => authorityMatrixService.createRule({
        methodId: methods[0]?.id ?? 1,
        isAffiliated: false,
        minValue: 1, minBase: "Absolute",
        maxValue: null, maxBase: "Absolute",
        approvalChainRu: t("authorityMatrixSettingsPage.defaultChain"),
        approvalAuthority: "Curator",
        commissionRequired: false,
        commissionSize: null,
        commissionMinBoardMembers: null,
        commissionNoteRu: "",
        sortOrder: (rules.at(-1)?.sortOrder ?? 0) + 10,
        isActive: true,
    }));

    const activeRules = useMemo(() => rules.filter((r) => r.isActive), [rules]);
    const affiliatedCount = useMemo(() => activeRules.filter((r) => r.isAffiliated).length, [activeRules]);

    return (
        <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/management/refs")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {t("dictionaries.navigateZakup")}
            </button>

            <div className="flex items-center gap-2.5 mb-1 mt-2">
                <span className="w-8 h-8 rounded-[9px] bg-[#eef0fd] text-[#4e57d6] grid place-items-center flex-none">
                    <Scale className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                </span>
                <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                    {t("authorityMatrixSettingsPage.title")}
                </h1>
            </div>
            <p className="mt-[10px] mb-5 text-[13px] text-[#8b97ab] leading-[1.5]">
                {t("authorityMatrixSettingsPage.subtitle")}
            </p>

            {loading && <Loader label={t("general.loading")}/>}

            {!loading && loadError && (
                <EmptyState
                    variant="error"
                    title={t("authorityMatrixSettingsPage.loadError")}
                    actionLabel={t("authorityMatrixSettingsPage.retry")}
                    onAction={() => {
                        setLoading(true);
                        void load();
                    }}
                />
            )}

            {!loading && !loadError && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
                        <StatTile icon={<Layers className="w-[15px] h-[15px]" strokeWidth={2}/>}
                                  tone={{fg: "#4e57d6", bg: "#eef0fd"}}
                                  label={t("authorityMatrixSettingsPage.stats.methods")}
                                  value={methods.length}/>
                        <StatTile icon={<ShieldCheck className="w-[15px] h-[15px]" strokeWidth={2}/>}
                                  tone={{fg: "#2f68f5", bg: "#eef3ff"}}
                                  label={t("authorityMatrixSettingsPage.stats.rules")}
                                  value={activeRules.length}/>
                        <StatTile icon={<Users className="w-[15px] h-[15px]" strokeWidth={2}/>}
                                  tone={{fg: "#b7791f", bg: "#fdf6e7"}}
                                  label={t("authorityMatrixSettingsPage.stats.affiliated")}
                                  value={affiliatedCount}/>
                    </div>

                    {!canEdit && (
                        <div className="mb-4 rounded-[10px] border border-[#e9edf3] bg-[#fafbfc] px-4 py-2.5 text-[12.5px] text-[#8b97ab]">
                            {t("authorityMatrixSettingsPage.readOnly")}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 rounded-[10px] border border-[#f3c9c9] bg-[#fdf0f0] px-4 py-2.5 text-[13px] text-[#b5352f]">
                            {error}
                        </div>
                    )}

                    <SectionHeader title={t("authorityMatrixSettingsPage.methodsTitle")}
                                   hint={t("authorityMatrixSettingsPage.methodsHint")}/>
                    <div className="rounded-2xl border border-[#e9edf3] bg-white overflow-hidden mb-8">
                        <div className="hidden md:grid grid-cols-[minmax(0,1fr)_200px_110px_40px] gap-3 px-5 py-2.5 bg-[#fafbfc] border-b border-[#eef2f7]">
                            <span className={LABEL}>{t("authorityMatrixSettingsPage.fieldFullTitle")}</span>
                            <span className={LABEL}>{t("authorityMatrixSettingsPage.fieldShortTitle")}</span>
                            <span className={LABEL}>{t("authorityMatrixSettingsPage.fieldMinProposals")}</span>
                            <span/>
                        </div>
                        {methods.map((m) => (
                            <MethodRow key={m.id} method={m} canEdit={canEdit} busy={busy}
                                       onSave={(req) => run(() => authorityMatrixService.updateMethod(m.id, req))}/>
                        ))}
                    </div>

                    <SectionHeader
                        title={t("authorityMatrixSettingsPage.rulesTitle")}
                        hint={t("authorityMatrixSettingsPage.rulesHint")}
                        action={canEdit && (
                            <button onClick={addRule} disabled={busy}
                                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[9px] bg-[#2f68f5]
                                               text-white text-[12.5px] font-semibold cursor-pointer hover:bg-[#2858d6]
                                               disabled:opacity-40 disabled:cursor-default">
                                <Plus size={14} strokeWidth={2.4}/>
                                {t("authorityMatrixSettingsPage.addRule")}
                            </button>
                        )}
                    />

                    <div className="flex flex-col gap-3.5">
                        {activeRules.map((r, index) => (
                            <RuleCard key={r.id} rule={r} index={index + 1} methods={methods}
                                      canEdit={canEdit} busy={busy}
                                      onSave={(req) => run(() => authorityMatrixService.updateRule(r.id, req))}
                                      onDelete={() => run(() => authorityMatrixService.deleteRule(r.id))}/>
                        ))}
                        {activeRules.length === 0 && (
                            <EmptyState title={t("authorityMatrixSettingsPage.noRules")}/>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function StatTile({icon, tone, label, value}: {
    icon: ReactNode;
    tone: { fg: string; bg: string };
    label: string;
    value: number;
}) {
    return (
        <div className="bg-white border-[1.5px] border-[#e9edf3] rounded-2xl px-[17px] py-[15px]">
            <div className="flex items-center gap-2.5 mb-2">
                <span className="w-7 h-7 rounded-lg grid place-items-center flex-none"
                      style={{background: tone.bg, color: tone.fg}}>
                    {icon}
                </span>
                <span className="text-[12.5px] font-bold text-[#55617a]">{label}</span>
            </div>
            <div className="text-[24px] font-bold tracking-[-0.02em] text-[#1c2740] leading-none">{value}</div>
        </div>
    );
}

function SectionHeader({title, hint, action}: { title: string; hint: string; action?: ReactNode }) {
    return (
        <div className="flex items-end justify-between gap-4 mb-3">
            <div>
                <h2 className="m-0 text-[15px] font-bold text-[#1c2740]">{title}</h2>
                <p className="mt-1 mb-0 text-[12.5px] text-[#8b97ab] leading-[1.5]">{hint}</p>
            </div>
            {action}
        </div>
    );
}

function Field({label, className = "", children}: { label: string; className?: string; children: ReactNode }) {
    return (
        <label className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
            <span className={LABEL}>{label}</span>
            {children}
        </label>
    );
}

function MethodRow({method, canEdit, busy, onSave}: {
    method: ProcurementMethodEdit;
    canEdit: boolean;
    busy: boolean;
    onSave: (req: { titleRu: string; shortTitleRu: string; minProposals: number; isActive: boolean }) => void;
}) {
    const {t} = useTranslation();
    const [title, setTitle] = useState(method.titleRu);
    const [short, setShort] = useState(method.shortTitleRu);
    const [min, setMin] = useState(method.minProposals);
    const changed = title !== method.titleRu || short !== method.shortTitleRu || min !== method.minProposals;

    return (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_200px_110px_40px] gap-3 items-end md:items-center
                        px-5 py-3 border-b border-[#eef2f7] last:border-b-0 relative">
            {changed && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#2f68f5]"/>}

            {/* The full method name is editable: the bank renames methods following the Regulation. */}
            <Field label={t("authorityMatrixSettingsPage.fieldFullTitle")} className="md:[&>span]:hidden">
                <input className={INPUT} value={title} disabled={!canEdit}
                       onChange={(e) => setTitle(e.target.value)}/>
            </Field>

            <Field label={t("authorityMatrixSettingsPage.fieldShortTitle")} className="md:[&>span]:hidden">
                <input className={INPUT} value={short} disabled={!canEdit}
                       onChange={(e) => setShort(e.target.value)}/>
            </Field>

            <Field label={t("authorityMatrixSettingsPage.fieldMinProposals")} className="md:[&>span]:hidden">
                <input type="number" min={0} className={INPUT} value={min} disabled={!canEdit}
                       onChange={(e) => setMin(Number(e.target.value))}/>
            </Field>

            {canEdit ? (
                <button
                    onClick={() => onSave({
                        titleRu: title.trim(),
                        shortTitleRu: short.trim(),
                        minProposals: min,
                        isActive: method.isActive,
                    })}
                    disabled={busy || !changed || !title.trim() || !short.trim()}
                    title={t("general.save")}
                    className="grid h-9 w-9 place-items-center rounded-[9px] border-none bg-transparent text-[#2f68f5]
                               cursor-pointer hover:bg-[#eef3ff] disabled:opacity-30 disabled:cursor-default
                               disabled:hover:bg-transparent"
                >
                    {changed ? <Save size={16}/> : <Check size={16}/>}
                </button>
            ) : <span/>}
        </div>
    );
}

function RuleCard({rule, index, methods, canEdit, busy, onSave, onDelete}: {
    rule: MatrixRuleEdit;
    index: number;
    methods: ProcurementMethodEdit[];
    canEdit: boolean;
    busy: boolean;
    onSave: (req: MatrixRuleSave) => void;
    onDelete: () => void;
}) {
    const {t} = useTranslation();
    const [f, setF] = useState<MatrixRuleSave>(toSave(rule));
    const changed = JSON.stringify(f) !== JSON.stringify(toSave(rule));
    const patch = (p: Partial<MatrixRuleSave>) => setF({...f, ...p});
    const tone = AUTHORITY_TONE[f.approvalAuthority];
    const methodTitle = methods.find((m) => m.id === f.methodId)?.shortTitleRu ?? "";

    return (
        <div className="rounded-2xl border border-[#e9edf3] bg-white overflow-hidden"
             style={{borderLeft: `4px solid ${tone.fg}`}}>
            <div className="flex flex-wrap items-center gap-2.5 px-5 py-3 bg-[#fafbfc] border-b border-[#eef2f7]">
                <span className="font-mono text-[13px] font-bold text-[#c3ccd8]">
                    {String(index).padStart(2, "0")}
                </span>
                <span className="text-[14px] font-bold text-[#1c2740]">{methodTitle}</span>

                <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[11.5px] font-bold"
                      style={{background: tone.bg, color: tone.fg}}>
                    {t(AUTHORITIES.find((a) => a.value === f.approvalAuthority)?.labelKey ?? "")}
                </span>
                {f.isAffiliated && (
                    <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[11.5px] font-bold bg-[#fdf6e7] text-[#b7791f]">
                        {t("authorityMatrixSettingsPage.affiliatedBadge")}
                    </span>
                )}
                {changed && (
                    <span className="text-[11.5px] font-semibold text-[#2f68f5]">
                        {t("authorityMatrixSettingsPage.unsaved")}
                    </span>
                )}

                <span className="flex-1"/>
                <span className="text-[12.5px] font-semibold text-[#55617a]">
                    {formatThreshold(f.minValue, f.minBase, t)} → {formatThreshold(f.maxValue, f.maxBase, t)}
                </span>

                {canEdit && (
                    <>
                        <button onClick={() => onSave(f)} disabled={busy || !changed}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] border-none bg-[#2f68f5]
                                           text-white text-[12.5px] font-semibold cursor-pointer hover:bg-[#2858d6]
                                           disabled:opacity-30 disabled:cursor-default">
                            <Save size={14}/> {t("general.save")}
                        </button>
                        <button onClick={onDelete} disabled={busy} title={t("authorityMatrixSettingsPage.deleteRule")}
                                className="grid h-8 w-8 place-items-center rounded-[8px] border-none bg-transparent
                                           text-[#b5352f] cursor-pointer hover:bg-[#fdf5f5] disabled:opacity-40">
                            <Trash2 size={15}/>
                        </button>
                    </>
                )}
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3.5 items-end">
                    <Field label={t("authorityMatrixSettingsPage.fieldMethod")}>
                        <select className={INPUT} value={f.methodId} disabled={!canEdit}
                                onChange={(e) => patch({methodId: Number(e.target.value)})}>
                            {methods.map((m) => <option key={m.id} value={m.id}>{m.shortTitleRu}</option>)}
                        </select>
                    </Field>
                    <CheckBoxOne checked={f.isAffiliated} disabled={!canEdit} tone="brand"
                                 onChange={(v) => patch({isAffiliated: v})}>
                        {t("authorityMatrixSettingsPage.affiliated")}
                    </CheckBoxOne>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <ThresholdField label={t("authorityMatrixSettingsPage.amountFrom")}
                                    value={f.minValue} base={f.minBase} disabled={!canEdit} placeholder="—"
                                    onValue={(v) => patch({minValue: v})} onBase={(b) => patch({minBase: b})}/>
                    <ThresholdField label={t("authorityMatrixSettingsPage.amountTo")}
                                    value={f.maxValue} base={f.maxBase} disabled={!canEdit}
                                    placeholder={t("authorityMatrixSettingsPage.noUpperLimit")}
                                    onValue={(v) => patch({maxValue: v})} onBase={(b) => patch({maxBase: b})}/>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px] gap-3.5">
                    <Field label={t("authorityMatrixSettingsPage.approvalChain")}>
                        <input className={INPUT} value={f.approvalChainRu} disabled={!canEdit}
                               onChange={(e) => patch({approvalChainRu: e.target.value})}/>
                    </Field>
                    <Field label={t("authorityMatrixSettingsPage.approvalAuthority")}>
                        <select className={INPUT} value={f.approvalAuthority} disabled={!canEdit}
                                onChange={(e) => patch({approvalAuthority: e.target.value as ApprovalAuthority})}>
                            {AUTHORITIES.map((a) => <option key={a.value} value={a.value}>{t(a.labelKey)}</option>)}
                        </select>
                    </Field>
                </div>

                <div className="rounded-xl border border-[#eef2f7] bg-[#fafbfc] p-3.5 flex flex-col gap-3.5">
                    <div>
                        <CheckBoxOne checked={f.commissionRequired} disabled={!canEdit} tone="brand"
                                     onChange={(v) => patch({commissionRequired: v})}>
                            {t("authorityMatrixSettingsPage.commission")}
                        </CheckBoxOne>
                    </div>

                    {f.commissionRequired && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <Field label={t("authorityMatrixSettingsPage.commissionSize")}>
                                <input type="number" min={0} className={INPUT} value={f.commissionSize ?? ""}
                                       disabled={!canEdit}
                                       onChange={(e) => patch({commissionSize: toNumberOrNull(e.target.value)})}/>
                            </Field>
                            <Field label={t("authorityMatrixSettingsPage.commissionBoardMembers")}>
                                <input type="number" min={0} className={INPUT} value={f.commissionMinBoardMembers ?? ""}
                                       disabled={!canEdit}
                                       onChange={(e) => patch({commissionMinBoardMembers: toNumberOrNull(e.target.value)})}/>
                            </Field>
                        </div>
                    )}

                    <Field label={t("authorityMatrixSettingsPage.commissionNote")}>
                        <input className={INPUT} value={f.commissionNoteRu} disabled={!canEdit}
                               onChange={(e) => patch({commissionNoteRu: e.target.value})}/>
                    </Field>
                </div>
            </div>
        </div>
    );
}

function ThresholdField({label, value, base, disabled, placeholder, onValue, onBase}: {
    label: string;
    value: number | null;
    base: ThresholdBase;
    disabled: boolean;
    placeholder: string;
    onValue: (v: number | null) => void;
    onBase: (b: ThresholdBase) => void;
}) {
    const {t} = useTranslation();
    return (
        <div className="flex flex-col gap-1.5 min-w-0">
            <span className={LABEL}>{label}</span>
            <div className="flex gap-2">
                <input type="number" className={`${INPUT} flex-1 min-w-0`} value={value ?? ""} disabled={disabled}
                       placeholder={placeholder} onChange={(e) => onValue(toNumberOrNull(e.target.value))}/>
                <select className={`${INPUT} w-[130px] flex-none`} value={base} disabled={disabled}
                        onChange={(e) => onBase(e.target.value as ThresholdBase)}>
                    {BASES.map((b) => <option key={b.value} value={b.value}>{t(b.labelKey)}</option>)}
                </select>
            </div>
        </div>
    );
}

const toNumberOrNull = (raw: string): number | null => (raw === "" ? null : Number(raw));

/** Short human-readable threshold for the card header: "500 000 som", "5 % of assets" or a dash. */
function formatThreshold(value: number | null, base: ThresholdBase, t: TFunction): string {
    if (value === null) return "—";
    const unit = t(BASES.find((b) => b.value === base)?.labelKey ?? "");
    return `${value.toLocaleString("ru-RU")} ${unit}`;
}

const toSave = (r: MatrixRuleEdit): MatrixRuleSave => ({
    methodId: r.methodId,
    isAffiliated: r.isAffiliated,
    minValue: r.minValue, minBase: r.minBase,
    maxValue: r.maxValue, maxBase: r.maxBase,
    approvalChainRu: r.approvalChainRu,
    approvalAuthority: r.approvalAuthority,
    commissionRequired: r.commissionRequired,
    commissionSize: r.commissionSize,
    commissionMinBoardMembers: r.commissionMinBoardMembers,
    commissionNoteRu: r.commissionNoteRu,
    sortOrder: r.sortOrder,
    isActive: r.isActive,
});

function extractMessage(e: unknown): string | null {
    if (e && typeof e === "object" && "response" in e) {
        return (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? null;
    }
    return null;
}
