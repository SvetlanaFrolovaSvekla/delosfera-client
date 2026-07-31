// Модал запуска согласования: конструктор маршрута + нормативы сроков
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ArrowDown,
    BookOpen,
    ChevronDown,
    Loader2,
    Plus,
    Scale,
    ShieldAlert,
    ShieldCheck,
    User,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { coordinationService } from "@/service/coordinationService/coordinationService.ts";
import {
    ApprovalStageKind,
    type ApprovalProcessResponse,
    type StartApprovalRequest,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import { VndSelectApproverModal, type ApproverOption } from "./VndSelectApproverModal";

interface VndStartApprovalModalProps {
    vndId: number;
    onClose: () => void;
    onStarted: (process: ApprovalProcessResponse) => void;
}

// ===== Фиксированные СП для обязательных этапов (зеркалит бэковый FixedApprovalOrgUnits) =====

const FIXED_STAGE_ORG_UNITS: Partial<Record<ApprovalStageKind, number>> = {
    [ApprovalStageKind.Legal]: 34,
    [ApprovalStageKind.RiskManagement]: 28,
    [ApprovalStageKind.Compliance]: 5,
    [ApprovalStageKind.Methodology]: 33,
};

const STAGE_LABELS: Record<ApprovalStageKind, string> = {
    [ApprovalStageKind.Legal]: "Юридическое управление",
    [ApprovalStageKind.RiskManagement]: "Риск-менеджмент",
    [ApprovalStageKind.Compliance]: "Комплаенс-контроль",
    [ApprovalStageKind.Custom]: "Доп. этап",
    [ApprovalStageKind.Methodology]: "Методология",
};

const STAGE_ICONS: Record<ApprovalStageKind, LucideIcon> = {
    [ApprovalStageKind.Legal]: Scale,
    [ApprovalStageKind.RiskManagement]: ShieldAlert,
    [ApprovalStageKind.Compliance]: ShieldCheck,
    [ApprovalStageKind.Custom]: User,
    [ApprovalStageKind.Methodology]: BookOpen,
};

const MAX_STAGES = 10;
const FIXED_KIND_ORDER: ApprovalStageKind[] = [
    ApprovalStageKind.Legal,
    ApprovalStageKind.RiskManagement,
    ApprovalStageKind.Compliance,
    ApprovalStageKind.Methodology,
];

interface StageDraft {
    localId: string;
    kind: ApprovalStageKind;
    orgUnitId?: number; // ограничение выбора для фиксированных этапов
    approverUserId: number | null;
    approverName: string | null;
}

function createInitialStages(): StageDraft[] {
    return FIXED_KIND_ORDER.map((kind) => ({
        localId: crypto.randomUUID(),
        kind,
        orgUnitId: FIXED_STAGE_ORG_UNITS[kind],
        approverUserId: null,
        approverName: null,
    }));
}

// ===== Карточка этапа =====

interface StageCardProps {
    stage: StageDraft;
    onOpenPicker: () => void;
    onRemove?: () => void;
    cardRef: (el: HTMLDivElement | null) => void;
}

function StageCard({ stage, onOpenPicker, onRemove, cardRef }: StageCardProps) {
    const Icon = STAGE_ICONS[stage.kind];
    const isCustom = stage.kind === ApprovalStageKind.Custom;

    return (
        <div
            ref={cardRef}
            className={`relative flex w-[210px] flex-none flex-col gap-3 rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(20,25,45,0.05)] ${
                isCustom ? "border border-[#e5e9f0]" : "border-2 border-[#34a853]"
            }`}
        >
            {isCustom && onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="cursor-pointer absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#e0473e] text-white shadow-sm transition-transform hover:scale-110"
                >
                    <X size={11} strokeWidth={3} />
                </button>
            )}

            <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] bg-[#f0f1fb] text-[#4e57d6]">
                    <Icon size={16} />
                </div>
                <span className="text-[12.5px] font-semibold leading-tight text-[#26324a]">
                    {STAGE_LABELS[stage.kind]}
                </span>
            </div>

            <button
                type="button"
                onClick={onOpenPicker}
                className="flex h-[36px] w-full cursor-pointer items-center justify-between rounded-[9px] border border-[#e5e9f0] bg-[#fbfcfe] px-2 text-left text-[12px] outline-none hover:border-[#4e57d6]/50 focus:border-[#4e57d6]"
            >
                <span className={`truncate ${stage.approverName ? "text-[#26324a]" : "text-[#a3adbd]"}`}>
                    {stage.approverName ?? "Выбрать согласующего…"}
                </span>
                <ChevronDown size={14} className="flex-none text-[#8b97ab]" />
            </button>
        </div>
    );
}

// ===== Блок норматива (в колонке) =====

interface NormBlockProps {
    label: string;
    value: number | "";
    onChange: (value: number | "") => void;
    blockRef?: React.Ref<HTMLDivElement>;
}

function NormBlock({ label, value, onChange, blockRef }: NormBlockProps) {
    return (
        <div
            ref={blockRef}
            className="flex w-[280px] flex-none items-center justify-between gap-3 rounded-[12px] border border-[#e5e9f0] bg-[#f9fafc] px-4 py-3"
        >
            <span className="text-[12px] font-medium leading-tight text-[#6b7488]">{label}</span>
            <div className="flex flex-none items-center gap-1">
                <input
                    type="number"
                    min={1}
                    value={value}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
                    className="h-[32px] w-[64px] rounded-[8px] border border-[#e5e9f0] bg-white text-center text-[12.5px] text-[#26324a] outline-none focus:border-[#4e57d6]"
                />
                <span className="text-[11px] text-[#8b97ab]">ч.</span>
            </div>
        </div>
    );
}

// ===== Основной модал =====

export function VndStartApprovalModal({ vndId, onClose, onStarted }: VndStartApprovalModalProps) {
    const [stages, setStages] = useState<StageDraft[]>(createInitialStages);
    const [pickerStageId, setPickerStageId] = useState<string | null>(null);
    const [primaryHours, setPrimaryHours] = useState<number | "">(72);
    const [repeatHours, setRepeatHours] = useState<number | "">(48);
    const [finalHoldHours, setFinalHoldHours] = useState<number | "">(24);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ===== Схема: "шинная" разводка линий от карточек этапов к "Первичному согласованию" =====
    // Каждая линия идёт строго вниз от своей карточки до общей горизонтальной "шины",
    // затем по шине до X координаты цели, затем строго вниз в блок цели.
    // Такая маршрутизация никогда не пересекает другие линии и никогда не заходит на карточки,
    // независимо от количества этапов (4, 5, 6 ... 10) — прямые углы гарантируют это геометрически.

    const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const targetRef = useRef<HTMLDivElement | null>(null);
    const funnelWrapperRef = useRef<HTMLDivElement | null>(null);
    const cardsScrollRef = useRef<HTMLDivElement | null>(null);
    const [paths, setPaths] = useState<string[]>([]);

    const recomputePaths = useCallback(() => {
        const wrapper = funnelWrapperRef.current;
        const target = targetRef.current;
        if (!wrapper || !target) return;

        const wrapperRect = wrapper.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2 - wrapperRect.left;
        const targetTopY = targetRect.top - wrapperRect.top;

        let maxCardBottom = 0;
        const points: { x: number; bottom: number }[] = [];
        stages.forEach((s) => {
            const el = stageRefs.current[s.localId];
            if (!el) return;
            const r = el.getBoundingClientRect();
            const x = r.left + r.width / 2 - wrapperRect.left;
            const bottom = r.bottom - wrapperRect.top;
            points.push({ x, bottom });
            if (bottom > maxCardBottom) maxCardBottom = bottom;
        });

        const trunkY = maxCardBottom + 26;

        const next = points.map(({ x, bottom }) => `M ${x} ${bottom} L ${x} ${trunkY} L ${targetX} ${trunkY} L ${targetX} ${targetTopY}`);
        setPaths(next);
    }, [stages]);

    useLayoutEffect(() => {
        recomputePaths();
        const ro = new ResizeObserver(recomputePaths);
        if (funnelWrapperRef.current) ro.observe(funnelWrapperRef.current);
        window.addEventListener("resize", recomputePaths);
        return () => {
            ro.disconnect();
            window.removeEventListener("resize", recomputePaths);
        };
    }, [recomputePaths]);

    // ===== Управление этапами =====

    const addCustomStage = () => {
        setStages((prev) => {
            if (prev.length >= MAX_STAGES) return prev;
            return [
                ...prev,
                {
                    localId: crypto.randomUUID(),
                    kind: ApprovalStageKind.Custom,
                    approverUserId: null,
                    approverName: null,
                },
            ];
        });
    };

    const removeCustomStage = (localId: string) => {
        setStages((prev) => prev.filter((s) => s.localId !== localId));
        delete stageRefs.current[localId];
    };

    const setStageApprover = (localId: string, user: ApproverOption) => {
        setStages((prev) =>
            prev.map((s) =>
                s.localId === localId ? { ...s, approverUserId: user.id, approverName: user.fullName } : s,
            ),
        );
    };

    const selectedUserIds = new Set(stages.map((s) => s.approverUserId).filter((id): id is number => id !== null));
    const activePickerStage = stages.find((s) => s.localId === pickerStageId) ?? null;

    // ===== Валидация и отправка =====

    const allApproversSelected = stages.every((s) => s.approverUserId !== null);
    const normsValid = Number(primaryHours) > 0 && Number(repeatHours) > 0 && Number(finalHoldHours) > 0;
    const canSubmit = allApproversSelected && normsValid && !submitting && stages.length > 0;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setSubmitting(true);
        setError(null);
        try {
            const request: StartApprovalRequest = {
                stages: stages.map((s) => ({
                    kind: s.kind,
                    approverUserId: s.approverUserId as number,
                })),
                primaryDeadlineHours: Number(primaryHours),
                repeatDeadlineHours: Number(repeatHours),
                finalHoldDeadlineHours: Number(finalHoldHours),
            };
            const result = await coordinationService.start(vndId, request);
            onStarted(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Не удалось запустить согласование");
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="flex h-[92vh] w-[95vw] max-w-[1280px] flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl">
                {/* Header */}
                <div className="flex flex-none items-center justify-between border-b border-[#eef0f5] px-7 py-5">
                    <div>
                        <h2 className="text-[17px] font-bold text-[#1c2740]">Запуск согласования</h2>
                        <p className="mt-[2px] text-[12.5px] text-[#8b97ab]">
                            Настройте маршрут и нормативы сроков для этой редакции
                        </p>
                    </div>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-7 py-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[13.5px] font-bold text-[#1c2740]">Конструктор маршрута</h3>
                        <span className="text-[11.5px] text-[#8b97ab]">
                            {stages.length} из {MAX_STAGES} этапов
                        </span>
                    </div>

                    <div ref={funnelWrapperRef} className="relative">
                        {/* Ряд карточек этапов — всегда в одну строку (скролл по горизонтали при 5+ этапах),
                            чтобы вертикальные отрезки линий никогда не упирались в карточку из другого ряда */}
                        <div ref={cardsScrollRef} onScroll={recomputePaths} className="flex gap-4 overflow-x-auto pb-2">
                            {stages.map((stage) => (
                                <StageCard
                                    key={stage.localId}
                                    stage={stage}
                                    onOpenPicker={() => setPickerStageId(stage.localId)}
                                    onRemove={
                                        stage.kind === ApprovalStageKind.Custom
                                            ? () => removeCustomStage(stage.localId)
                                            : undefined
                                    }
                                    cardRef={(el) => {
                                        stageRefs.current[stage.localId] = el;
                                    }}
                                />
                            ))}

                            {stages.length < MAX_STAGES && (
                                <button
                                    type="button"
                                    onClick={addCustomStage}
                                    className="flex h-[110px] w-[210px] flex-none cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                                >
                                    <Plus size={18} />
                                    <span className="text-[12px] font-medium">Добавить этап</span>
                                </button>
                            )}
                        </div>

                        {/* SVG с прямоугольной "шинной" разводкой линий */}
                        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                            {paths.map((d, i) => (
                                <path key={i} d={d} stroke="#d5dae3" strokeWidth={1.5} fill="none" />
                            ))}
                        </svg>

                        {/* Нормативы согласования — колонкой */}
                        <div className="mx-auto mt-12 flex w-[280px] flex-col items-center gap-2">
                            <NormBlock
                                label="Первичное согласование"
                                value={primaryHours}
                                onChange={setPrimaryHours}
                                blockRef={targetRef}
                            />
                            <ArrowDown size={16} className="flex-none text-[#c3c9d4]" />
                            <NormBlock
                                label="Согласование после внесённых изменений"
                                value={repeatHours}
                                onChange={setRepeatHours}
                            />
                            <ArrowDown size={16} className="flex-none text-[#c3c9d4]" />
                            <NormBlock label="Финальная выдержка" value={finalHoldHours} onChange={setFinalHoldHours} />
                        </div>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-none items-center justify-end gap-2 border-t border-[#eef0f5] px-7 py-4">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="cursor-pointer h-[40px] rounded-[10px] border border-[#e5e9f0] px-5 text-[13px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="cursor-pointer flex h-[40px] items-center gap-2 rounded-[10px] bg-[#4e57d6] px-5 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {submitting && <Loader2 size={15} className="animate-spin" />}
                        Запустить согласование
                    </button>
                </div>
            </div>

            {activePickerStage && (
                <VndSelectApproverModal
                    lockedOrgUnitId={activePickerStage.orgUnitId}
                    lockedOrgUnitLabel={
                        activePickerStage.orgUnitId ? STAGE_LABELS[activePickerStage.kind] : undefined
                    }
                    excludedUserIds={selectedUserIds}
                    onClose={() => setPickerStageId(null)}
                    onSelect={(user) => setStageApprover(activePickerStage.localId, user)}
                />
            )}
        </div>,
        document.body,
    );
}