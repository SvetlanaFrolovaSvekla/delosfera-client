import {useCallback, useEffect, useState} from "react";
import {Plus, Trash2, Save} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {
    authorityMatrixService,
    type MatrixRuleEdit, type MatrixRuleSave,
    type ProcurementMethodEdit, type ThresholdBase, type ApprovalAuthority,
} from "@/service/procurementService/authorityMatrixService.ts";

/**
 * Настройка Матрицы полномочий: пороги сумм, минимум КП и состав согласования.
 *
 * Раньше эти значения жили только в коде и правились сборкой — сектор закупок
 * просил менять их сам по Положению. Здесь способ задаёт, сколько КП минимум, а
 * правило — при какой сумме кто согласует и нужна ли комиссия.
 */

const input = "h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none " +
    "focus:border-[#2f68f5]";

const BASES: {v: ThresholdBase; t: string}[] = [
    {v: "Absolute", t: "сом"},
    {v: "PercentOfAssets", t: "% активов"},
    {v: "PercentOfEquity", t: "% ЧСК"},
];

const AUTHORITIES: {v: ApprovalAuthority; t: string}[] = [
    {v: "None", t: "Не требуется"},
    {v: "Curator", t: "Куратор"},
    {v: "Board", t: "Правление"},
    {v: "SupervisoryBoard", t: "Совет директоров"},
    {v: "Shareholders", t: "Общее собрание"},
];

export function AuthorityMatrixSettingsPage() {
    const {hasPermission} = useAuth();
    const canEdit = hasPermission(PermissionCode.ManageProcurementDictionaries);

    const [methods, setMethods] = useState<ProcurementMethodEdit[]>([]);
    const [rules, setRules] = useState<MatrixRuleEdit[]>([]);
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
            setError(null);
        } catch {
            setError("Не удалось загрузить матрицу — нужно право на справочники закупок");
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const run = async (действие: () => Promise<unknown>) => {
        setBusy(true);
        try {
            await действие();
            await load();
            setError(null);
        } catch (e) {
            setError(извлечь(e) ?? "Не удалось сохранить");
        } finally {
            setBusy(false);
        }
    };

    const добавитьПравило = () => run(() => authorityMatrixService.createRule({
        methodId: methods[0]?.id ?? 1,
        isAffiliated: false,
        minValue: 1, minBase: "Absolute",
        maxValue: null, maxBase: "Absolute",
        approvalChainRu: "Куратор",
        approvalAuthority: "Curator",
        commissionRequired: false,
        commissionSize: null,
        commissionMinBoardMembers: null,
        commissionNoteRu: "",
        sortOrder: (rules.at(-1)?.sortOrder ?? 0) + 10,
        isActive: true,
    }));

    return (
        <div className="p-[22px_26px] max-w-[1100px]">
            <h1 className="m-0 mb-1 text-[18px] font-semibold text-[#0f1b2d]">Матрица полномочий</h1>
            <p className="m-0 mb-5 text-[13px] text-[#8b97ab]">
                Пороги сумм, минимум коммерческих предложений и состав согласования по Положению о закупках.
            </p>

            {error && (
                <div className="mb-4 rounded-[9px] border border-[#f3c9c9] bg-[#fdf0f0] px-4 py-2.5
                                text-[13px] text-[#b5352f]">{error}</div>
            )}

            <h2 className="m-0 mb-2.5 text-[14px] font-semibold text-[#0f1b2d]">Способы закупки</h2>
            <div className="rounded-[12px] border border-[#e5e9f0] bg-white overflow-hidden mb-8">
                {methods.map((m) => (
                    <MethodRow key={m.id} method={m} canEdit={canEdit} busy={busy}
                               onSave={(req) => run(() => authorityMatrixService.updateMethod(m.id, req))}/>
                ))}
            </div>

            <div className="flex items-center justify-between mb-2.5">
                <h2 className="m-0 text-[14px] font-semibold text-[#0f1b2d]">Правила: при какой сумме кто согласует</h2>
                {canEdit && (
                    <button onClick={добавитьПравило} disabled={busy}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] border border-[#e5e9f0]
                                       bg-white text-[12.5px] font-medium text-[#2f68f5] hover:bg-[#f6f8fb]">
                        <Plus size={14}/> Правило
                    </button>
                )}
            </div>

            <div className="flex flex-col gap-2.5">
                {rules.filter((r) => r.isActive).map((r) => (
                    <RuleRow key={r.id} rule={r} methods={methods} canEdit={canEdit} busy={busy}
                             onSave={(req) => run(() => authorityMatrixService.updateRule(r.id, req))}
                             onDelete={() => run(() => authorityMatrixService.deleteRule(r.id))}/>
                ))}
                {rules.filter((r) => r.isActive).length === 0 && (
                    <div className="text-[13px] text-[#8b97ab]">Правил пока нет.</div>
                )}
            </div>
        </div>
    );
}

function MethodRow({method, canEdit, busy, onSave}: {
    method: ProcurementMethodEdit;
    canEdit: boolean;
    busy: boolean;
    onSave: (req: {titleRu: string; shortTitleRu: string; minProposals: number; isActive: boolean}) => void;
}) {
    const [title, setTitle] = useState(method.titleRu);
    const [short, setShort] = useState(method.shortTitleRu);
    const [min, setMin] = useState(method.minProposals);
    const менялось = title !== method.titleRu || short !== method.shortTitleRu || min !== method.minProposals;

    return (
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#eef2f7] last:border-b-0">
            {/* Полное название способа редактируется: банк меняет наименования по
                Положению (например «Простая» → «Запрос ценовых предложений»). */}
            <input className={`${input} flex-1 min-w-0`} value={title} disabled={!canEdit}
                   onChange={(e) => setTitle(e.target.value)}/>

            <label className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                короткое
                <input className={`${input} w-[130px]`} value={short} disabled={!canEdit}
                       onChange={(e) => setShort(e.target.value)}/>
            </label>

            <label className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                минимум КП
                <input type="number" min={0} className={`${input} w-[70px]`} value={min} disabled={!canEdit}
                       onChange={(e) => setMin(Number(e.target.value))}/>
            </label>

            {canEdit && (
                <button
                    onClick={() => onSave({titleRu: title.trim(), shortTitleRu: short.trim(), minProposals: min, isActive: method.isActive})}
                    disabled={busy || !менялось || !title.trim() || !short.trim()}
                    className="grid h-8 w-8 place-items-center rounded-[8px] text-[#2f68f5]
                               hover:bg-[#f0f5ff] disabled:opacity-30" title="Сохранить">
                    <Save size={15}/>
                </button>
            )}
        </div>
    );
}

function RuleRow({rule, methods, canEdit, busy, onSave, onDelete}: {
    rule: MatrixRuleEdit;
    methods: ProcurementMethodEdit[];
    canEdit: boolean;
    busy: boolean;
    onSave: (req: MatrixRuleSave) => void;
    onDelete: () => void;
}) {
    const [f, setF] = useState<MatrixRuleSave>(toSave(rule));
    const менялось = JSON.stringify(f) !== JSON.stringify(toSave(rule));
    const patch = (p: Partial<MatrixRuleSave>) => setF({...f, ...p});

    return (
        <div className="rounded-[11px] border border-[#e5e9f0] bg-white p-3.5">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <select className={`${input} w-[160px]`} value={f.methodId} disabled={!canEdit}
                        onChange={(e) => patch({methodId: Number(e.target.value)})}>
                    {methods.map((m) => <option key={m.id} value={m.id}>{m.shortTitleRu}</option>)}
                </select>

                <label className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                    <input type="checkbox" checked={f.isAffiliated} disabled={!canEdit}
                           onChange={(e) => patch({isAffiliated: e.target.checked})}/>
                    аффилир.
                </label>

                <span className="flex-1"/>

                {canEdit && (
                    <>
                        <button onClick={() => onSave(f)} disabled={busy || !менялось}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] bg-[#2f68f5] text-white
                                           text-[12.5px] font-medium disabled:opacity-30">
                            <Save size={14}/> Сохранить
                        </button>
                        <button onClick={onDelete} disabled={busy} title="Погасить правило"
                                className="grid h-8 w-8 place-items-center rounded-[8px] text-[#b5352f] hover:bg-[#fdf5f5]">
                            <Trash2 size={14}/>
                        </button>
                    </>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="text-[#8b97ab]">от</span>
                <input type="number" className={`${input} w-[120px]`} value={f.minValue ?? ""} disabled={!canEdit}
                       placeholder="—"
                       onChange={(e) => patch({minValue: e.target.value === "" ? null : Number(e.target.value)})}/>
                <BaseSelect value={f.minBase} disabled={!canEdit} onChange={(v) => patch({minBase: v})}/>

                <span className="text-[#8b97ab] ml-2">до</span>
                <input type="number" className={`${input} w-[120px]`} value={f.maxValue ?? ""} disabled={!canEdit}
                       placeholder="без верха"
                       onChange={(e) => patch({maxValue: e.target.value === "" ? null : Number(e.target.value)})}/>
                <BaseSelect value={f.maxBase} disabled={!canEdit} onChange={(v) => patch({maxBase: v})}/>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <input className={`${input} flex-1 min-w-[220px]`} value={f.approvalChainRu} disabled={!canEdit}
                       placeholder="Состав согласования" onChange={(e) => patch({approvalChainRu: e.target.value})}/>
                <select className={`${input} w-[180px]`} value={f.approvalAuthority} disabled={!canEdit}
                        onChange={(e) => patch({approvalAuthority: e.target.value as ApprovalAuthority})}>
                    {AUTHORITIES.map((a) => <option key={a.v} value={a.v}>{a.t}</option>)}
                </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <label className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                    <input type="checkbox" checked={f.commissionRequired} disabled={!canEdit}
                           onChange={(e) => patch({commissionRequired: e.target.checked})}/>
                    комиссия
                </label>
                {f.commissionRequired && (
                    <>
                        <input type="number" className={`${input} w-[80px]`} value={f.commissionSize ?? ""}
                               disabled={!canEdit} placeholder="размер"
                               onChange={(e) => patch({commissionSize: e.target.value === "" ? null : Number(e.target.value)})}/>
                        <input type="number" className={`${input} w-[130px]`} value={f.commissionMinBoardMembers ?? ""}
                               disabled={!canEdit} placeholder="из них Правления"
                               onChange={(e) => patch({commissionMinBoardMembers: e.target.value === "" ? null : Number(e.target.value)})}/>
                    </>
                )}
                <input className={`${input} flex-1 min-w-[200px]`} value={f.commissionNoteRu} disabled={!canEdit}
                       placeholder="Примечание к комиссии" onChange={(e) => patch({commissionNoteRu: e.target.value})}/>
            </div>
        </div>
    );
}

function BaseSelect({value, disabled, onChange}: {
    value: ThresholdBase; disabled: boolean; onChange: (v: ThresholdBase) => void;
}) {
    return (
        <select className={`${input} w-[110px]`} value={value} disabled={disabled}
                onChange={(e) => onChange(e.target.value as ThresholdBase)}>
            {BASES.map((b) => <option key={b.v} value={b.v}>{b.t}</option>)}
        </select>
    );
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

function извлечь(e: unknown): string | null {
    if (e && typeof e === "object" && "response" in e) {
        return (e as {response?: {data?: {message?: string}}}).response?.data?.message ?? null;
    }
    return null;
}
