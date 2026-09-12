import {ChevronRight} from "lucide-react";
import {
    PARTICIPANT_STATE_LABEL,
    RESOLUTION_LABEL,
    type RouteInstance,
    type RouteStep,
} from "@/service/workflowService/workflowService.ts";

/**
 * Визуальный маршрут согласования — как в ВНД, но на общей модели RouteInstance
 * (СЗ и закупки живут на ней). Горизонтальная цепочка карточек-этапов со связями:
 * видно, где сейчас документ, кто уже решил и что именно.
 *
 * Это обзорная полоса поверх подробного списка с действиями — она не заменяет
 * кнопки «Согласовать/Отклонить», а даёт цельную картину маршрута с одного взгляда.
 */

type Tone = "passed" | "current" | "upcoming" | "rejected";

const TONE: Record<Tone, { border: string; bg: string; dot: string; label: string }> = {
    passed:   {border: "#bfe3cd", bg: "#f2faf5", dot: "#1c7a4d", label: "#1c7a4d"},
    current:  {border: "#cbddff", bg: "#eef5ff", dot: "#2f68f5", label: "#2f68f5"},
    upcoming: {border: "#e5e9f0", bg: "#fafbfd", dot: "#c3ccd8", label: "#a3adbd"},
    rejected: {border: "#f1c9c2", bg: "#fdf2f0", dot: "#c0392b", label: "#c0392b"},
};

function kindLabel(kind: string): string {
    if (kind === "Signing") return "Подпись";
    if (kind === "Approval") return "Согласование";
    return kind;
}

function stepTone(step: RouteStep, currentOrder: number): Tone {
    const rejected = step.participants.some(
        (p) => p.resolution?.type === "Rejected" || p.resolution?.type === "Veto");
    if (rejected) return "rejected";

    const allDone = step.participants.length > 0
        && step.participants.every((p) => p.state === "Done" || p.state === "Cancelled");
    if (allDone) return "passed";

    if (step.order === currentOrder) return "current";
    return "upcoming";
}

export function RouteFlowView({route}: { route: RouteInstance }) {
    const steps = [...route.steps].sort((a, b) => a.order - b.order);
    if (steps.length === 0) return null;

    return (
        <div className="overflow-x-auto pb-1">
            <div className="flex items-stretch gap-1.5 min-w-min">
                {steps.map((step, i) => {
                    const tone = TONE[stepTone(step, route.currentStepOrder)];
                    return (
                        <div key={step.id} className="flex items-center gap-1.5">
                            <div
                                className="w-[190px] flex-none rounded-[11px] border px-3 py-2.5"
                                style={{borderColor: tone.border, background: tone.bg}}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-[10.5px] font-bold text-white"
                                        style={{background: tone.dot}}
                                    >
                                        {step.order}
                                    </span>
                                    <span className="text-[11px] font-bold uppercase tracking-[.03em]"
                                          style={{color: tone.label}}>
                                        {kindLabel(step.kind)}
                                    </span>
                                </div>

                                <div className="mt-2 flex flex-col gap-1.5">
                                    {step.participants.map((p) => (
                                        <div key={p.id}>
                                            <div className="truncate text-[12.5px] text-[#1c2740]">
                                                {p.userFullName ?? "—"}
                                            </div>
                                            <div className="text-[11px] text-[#8b97ab]">
                                                {p.resolution
                                                    ? RESOLUTION_LABEL[p.resolution.type]
                                                    : PARTICIPANT_STATE_LABEL[p.state]}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {i < steps.length - 1 && (
                                <ChevronRight className="h-4 w-4 flex-none text-[#c3ccd8]" strokeWidth={2}/>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
