/**
 * Кадровик УЧР на своём этапе маршрута отмечает по СЗ на обучение, заложено ли оно
 * в бюджет, и привязывает к позиции Плана закупок (КСЗ-08). Действует, пока записка
 * не завершена, - отдельно от правки черновика автором.
 *
 */
import {useEffect, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {szService, type SzDetails} from "@/service/szService/szService.ts";
import {planItemLookupService, type PlanItemLookup} from "@/service/procurementService/planItemLookupService.ts";
import {toast} from "@/service/toastService.ts";
import {inputClass, intlLocale, serverMessage} from "@/utils/szProcess/szCardUtils.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {Field} from "@/components/componentsDocumentsTypes/Field.tsx";
import {Search, X} from "lucide-react";

type BudgetChoice = "" | "yes" | "no";

const BUDGET_CHOICES: BudgetChoice[] = ["", "yes", "no"];

const BUDGET_LABEL_KEYS: Record<BudgetChoice, string> = {
    "": "szCard.trainingBudget.budgetUnset",
    yes: "szCard.trainingBudget.budgetYes",
    no: "szCard.trainingBudget.budgetNo",
};

export function SzTrainingBudgetPanel({sz, canEdit, onChanged}: {
    sz: SzDetails;
    canEdit: boolean;
    onChanged: () => void;
}) {
    const {t, i18n} = useTranslation();
    const finished = ["Executed", "Rejected", "Withdrawn", "Archived"].includes(sz.statusCode);

    const [budget, setBudget] = useState<BudgetChoice>(
        sz.hasBudget == null ? "" : sz.hasBudget ? "yes" : "no");
    const [planItemId, setPlanItemId] = useState<number | null>(sz.planItemId);
    const [planLabel, setPlanLabel] = useState<string | null>(sz.planItemLabel);

    const [query, setQuery] = useState("");
    const [options, setOptions] = useState<PlanItemLookup[]>([]);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timer = useRef<number | null>(null);

    useEffect(() => {
        if (!open) return;
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(async () => {
            try { setOptions(await planItemLookupService.search(query, sz.employeeUnitId, 20)); }
            catch { setOptions([]); }
        }, 250);
        return () => { if (timer.current) window.clearTimeout(timer.current); };
    }, [query, open, sz.employeeUnitId]);

    async function save() {
        setSaving(true);
        setError(null);
        try {
            const d = await szService.setTrainingBudget(sz.id, budget === "" ? null : budget === "yes", planItemId);
            setPlanLabel(d.planItemLabel);
            toast.success(t("szCard.trainingBudget.savedToast"));
            onChanged();
        } catch (e) {
            setError(serverMessage(e) ?? t("szCard.trainingBudget.saveFailed"));
        } finally {
            setSaving(false);
        }
    }

    const numberLocale = intlLocale(i18n.language);

    const budgetText = sz.hasBudget == null
        ? t("szCard.trainingBudget.budgetNotSet")
        : sz.hasBudget ? t("szCard.trainingBudget.budgetYes") : t("szCard.trainingBudget.budgetNo");

    // Тем, кто не ведёт кадровые СЗ, показываем только результат — без органов управления.
    if (!canEdit) {
        if (sz.hasBudget == null && !sz.planItemLabel) return null;
        return (
            <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                <div className="mb-3 text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    {t("szCard.trainingBudget.title")}
                </div>
                <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3 text-[13px] text-[#1c2740]">
                    {budgetText}
                    {sz.planItemLabel && (
                        <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                            {t("szCard.trainingBudget.planItemValue", {label: sz.planItemLabel, interpolation: {escapeValue: false}})}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between mb-1">
                <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    {/* Бюджет обучения и план закупок */}
                    {t("szCard.trainingBudget.editTitle")}
                </div>
                <span className="rounded-full bg-[#f2f5f9] px-[9px] py-[2px] text-[11.5px] font-semibold text-[#55617a]">
                    {t("szCard.trainingBudget.hrBadge")}
                </span>
            </div>
            <div className="mb-3 text-[12px] text-[#8b97ab]">{t("szCard.trainingBudget.hint")}</div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {finished ? (
                <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3 text-[13px] text-[#8b97ab]">
                    {t("szCard.trainingBudget.finished")}
                    {sz.planItemLabel && (
                        <div className="mt-0.5 text-[#1c2740]">
                            {t("szCard.trainingBudget.planItemValue", {label: sz.planItemLabel, interpolation: {escapeValue: false}})}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {/* Финансирование — переключатель из трёх кнопок */}
                    <div>
                        <div className="mb-[5px] text-[11.5px] text-[#4d5a72]">{t("szCard.trainingBudget.financing")}</div>
                        <div className="flex flex-wrap gap-2">
                            {BUDGET_CHOICES.map((v) => {
                                const active = budget === v;
                                return (
                                    <button
                                        key={v || "unset"}
                                        type="button"
                                        onClick={() => setBudget(v)}
                                        className={`h-9 cursor-pointer rounded-[9px] border px-3.5 text-[12.5px] font-semibold transition-colors ${
                                            active
                                                ? "border-[#2f68f5] bg-[#eaf1ff] text-[#2f68f5]"
                                                : "border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"
                                        }`}
                                    >
                                        {t(BUDGET_LABEL_KEYS[v])}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Позиция плана закупок */}
                    <div className="max-w-[640px]">
                        <Field label={t("szCard.trainingBudget.planItem")}>
                            {planItemId ? (
                                <div className="flex h-10 items-center justify-between gap-2 rounded-[9px] border border-[#cbddff] bg-[#f5f8ff] px-3 text-[13px]">
                                    <span className="truncate font-medium text-[#1c2740]">
                                        {planLabel ?? t("szCard.trainingBudget.planItemFallback", {id: planItemId})}
                                    </span>
                                    <button
                                        type="button"
                                        title={t("szCard.trainingBudget.removePlanItem")}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setPlanItemId(null);
                                            setPlanLabel(null);
                                        }}
                                        className="grid h-6 w-6 flex-none cursor-pointer place-items-center rounded-[6px] border-none bg-transparent text-[#a3adbd] hover:bg-[#fbeae7] hover:text-[#c0392b]"
                                    >
                                        <X size={14}/>
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#a3adbd]"/>
                                    <input
                                        className={`${inputClass} pl-8`}
                                        placeholder={t("szCard.trainingBudget.searchPlaceholder")}
                                        value={query}
                                        onFocus={() => setOpen(true)}
                                        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
                                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                                    />
                                    {open && options.length > 0 && (
                                        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-[240px] overflow-auto rounded-[10px] border border-[#e5e9f0] bg-white py-1 shadow-[0_12px_28px_-12px_rgba(16,24,40,0.25)]">
                                            {options.map((o) => (
                                                <button
                                                    key={o.id}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setPlanItemId(o.id);
                                                        setPlanLabel(`${o.code} — ${o.subject}`);
                                                        setQuery("");
                                                        setOpen(false);
                                                    }}
                                                    className="block w-full cursor-pointer border-none bg-transparent px-3 py-2 text-left text-[13px] hover:bg-[#f6f8fb]"
                                                >
                                                    <span className="font-semibold text-[#1c2740]">{o.code}</span>
                                                    <span className="text-[#55617a]"> — {o.subject}</span>
                                                    <span className="block text-[11.5px] text-[#8b97ab]">
                                                        {t("szCard.trainingBudget.optionMeta", {
                                                            year: o.year,
                                                            amount: o.remainingAmount.toLocaleString(numberLocale),
                                                        })}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </Field>
                    </div>

                    <div>
                        <SzButton variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
                            {saving ? t("szCard.trainingBudget.saving") : t("szCard.trainingBudget.save")}
                        </SzButton>
                    </div>
                </div>
            )}
        </div>
    );
}
