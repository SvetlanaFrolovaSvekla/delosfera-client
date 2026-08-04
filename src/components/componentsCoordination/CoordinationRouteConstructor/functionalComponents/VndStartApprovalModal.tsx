// Модалка запуска согласования: конструктор маршрута + нормативы сроков
import {createPortal} from "react-dom";
import {
    ApprovalStageKind,
    type ApprovalProcessResponse,
} from "@/service/coordinationService/coordinationServiceTypes.ts";
import {MAX_STAGES, STAGE_LABELS} from "@/constants/coordinationParams.ts";
import {StageCard} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/StageCard.tsx";
import {VndSelectApproverModal} from "./VndSelectApproverModal.tsx";
import {ArrowDown, Loader2, Plus, X} from "lucide-react";
import {NormBlock} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/NormBlock.tsx";
import {useStageDrafts} from "@/hooks/coordinationHooks/useStageDrafts.ts";
import {useApprovalNorms} from "@/hooks/coordinationHooks/useApprovalNorms.ts";
import {useStartApproval} from "@/hooks/coordinationHooks/useStartApproval.ts";
import {useStageRouting} from "@/hooks/coordinationHooks/useStageRouting.ts";
import {Clue} from "@/components/componentsGeneral/knowledgeBaseComponents/Clue.tsx";

interface VndStartApprovalModalProps {
    vndId: number;
    onClose: () => void;
    onStarted: (process: ApprovalProcessResponse) => void;
}

export function VndStartApprovalModal({vndId, onClose, onStarted}: VndStartApprovalModalProps) {
    const {
        stages,
        addCustomStage,
        removeCustomStage,
        setStageApprover,
        selectedUserIds,
        allApproversSelected,
        setPickerStageId,
        activePickerStage,
    } = useStageDrafts(); // Логика с настройкой этапов согласования

    const {
        primaryHours,
        setPrimaryHours,
        repeatHours,
        setRepeatHours,
        finalHoldHours,
        setFinalHoldHours,
        normsValid,
    } = useApprovalNorms(); // Логика с настройкой нормативов согласования

    const {submitting, error, canSubmit, handleSubmit} = useStartApproval({
        vndId,
        stages,
        allApproversSelected,
        normsValid,
        primaryHours,
        repeatHours,
        finalHoldHours,
        onStarted,
    });

    const {funnelWrapperRef, targetRef, cardsScrollRef, paths, recomputePaths, registerStageRef} =
        useStageRouting(stages); // Для рисовки линий от этапов к блокам нормативов

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div
                className="flex h-[92vh] w-[95vw] max-w-[1280px] flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl">
                {/* Header */}
                <div className="flex flex-none items-center justify-between border-b border-[#eef0f5] px-7 py-5">
                    <div>
                        <h2 className="text-[17px] font-bold text-[#1c2740]">Запуск согласования</h2>
                        <p className="mt-[2px] text-[12.5px] text-[#8b97ab]">
                            Настройте маршрут и нормативы сроков для этой редакции
                        </p>
                    </div>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={22}/>
                    </button>
                </div>

                {/* Header */}
                <div className="px-4 py-4 flex flex-none items-center justify-between border-b border-[#eef0f5]">
                    <Clue>
                        Добавьте согласующих на каждом этапе и задайте нормативы сроков! Зеленым выделены фиксированные этапы, которые нельзя открепить.
                    </Clue>
                </div>

                {/* Контент */}
                <div className="flex-1 overflow-y-auto px-12 py-4">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[13.5px] font-bold text-[#1c2740]">Конструктор маршрута</h3>
                        <span className="text-[11.5px] text-[#8b97ab]">
                            {stages.length} из {MAX_STAGES} этапов
                        </span>
                    </div>

                    <div ref={funnelWrapperRef} className="relative">
                        {/* Ряд карточек этапов - всегда в одну строку (скролл по горизонтали при 5+ этапах) */}
                        <div ref={cardsScrollRef} onScroll={recomputePaths} className="py-5 flex gap-6 overflow-x-auto">
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
                                    cardRef={registerStageRef(stage.localId)}
                                />
                            ))}

                            {stages.length < MAX_STAGES && (
                                <button
                                    type="button"
                                    onClick={addCustomStage}
                                    className="flex h-[110px] w-[210px] flex-none cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[#d5dae3] bg-[#fbfcfe] text-[#8b97ab] transition-colors hover:border-[#4e57d6]/50 hover:bg-[#f6f8fb]"
                                >
                                    <Plus size={18}/>
                                    <span className="text-[12px] font-medium">Добавить этап</span>
                                </button>
                            )}
                        </div>

                        {/* SVG с прямоугольной разводкой линий */}
                        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                            {paths.map((d, i) => (
                                <path key={i} d={d} stroke="#d5dae3" strokeWidth={1.5} fill="none"/>
                            ))}
                        </svg>

                        {/* Нормативы согласования — колонкой */}
                        <div className="mx-auto mt-10 flex w-[280px] flex-col items-center gap-4">
                            <NormBlock
                                label="Первичное согласование"
                                value={primaryHours}
                                onChange={setPrimaryHours}
                                blockRef={targetRef}
                            />
                            <ArrowDown size={16} className="flex-none text-[#c3c9d4]"/>
                            <NormBlock
                                label="Согласование после внесённых изменений"
                                value={repeatHours}
                                onChange={setRepeatHours}
                            />
                            <ArrowDown size={16} className="flex-none text-[#c3c9d4]"/>
                            <NormBlock label="Финальная выдержка" value={finalHoldHours} onChange={setFinalHoldHours}/>
                        </div>
                    </div>

                    {error && (
                        <div
                            className="mt-5 rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-3 py-2 text-[12.5px] text-[#c0392b]">
                            {error}
                        </div>
                    )}
                </div>

                {/* Футер */}
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
                        {submitting && <Loader2 size={15} className="animate-spin"/>}
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