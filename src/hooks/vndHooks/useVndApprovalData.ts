// Данные о согласовании ВНД, нужные вкладке "Редакции"
import {useEffect, useState} from "react";
import {coordinationService} from "@/service/coordinationService/coordinationService.ts";
import type {ApprovalProcessResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";

export function useVndApprovalData(vnd: VndResponse, userId: number | undefined, isVndEditor: boolean, redactionsCount: number) {
    // Текущий процесс согласования. Грузим один раз при открытии вкладки - отсутствие процесса
    // (ВНД ещё не отправлялась) не ошибка, просто связанные с ним кнопки не покажутся.
    const [approvalProcess, setApprovalProcess] = useState<ApprovalProcessResponse | null>(null);
    useEffect(() => {
        let cancelled = false;
        coordinationService.getByVndId(vnd.id)
            .then((data) => {
                if (!cancelled) setApprovalProcess(data);
            })
            .catch(() => {
                if (!cancelled) setApprovalProcess(null);
            });
        return () => {
            cancelled = true;
        };
    }, [vnd.id]);

    // История всех процессов согласования - нужна только для окна "Сравнение редакций":
    // промежуточные версии ("Р2.1", "Р2.2"...) лежат снимками внутри процессов (см.
    // expandRedactionsWithRevisions). Рядовому пользователю они не показываются - не грузим.
    const [approvalHistory, setApprovalHistory] = useState<ApprovalProcessResponse[]>([]);
    useEffect(() => {
        if (!isVndEditor) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setApprovalHistory([]);
            return;
        }
        let cancelled = false;
        coordinationService.getHistory(vnd.id)
            .then((data) => {
                if (!cancelled) setApprovalHistory(data);
            })
            .catch(() => {
                if (!cancelled) setApprovalHistory([]);
            });
        return () => {
            cancelled = true;
        };
    }, [vnd.id, isVndEditor, redactionsCount]);

    // Кнопка "Перейти к согласованию" в статус-баннере ("pending") - только тем, кому есть
    // смысл сразу перейти на "Ход согласования": участвующему согласующему, инициатору
    // согласования и инициатору самой ВНД.
    const isApprovalParticipant = !!approvalProcess && userId !== undefined &&
        approvalProcess.stages.some((s) => s.approverUserId === userId);
    const isApprovalInitiator = !!approvalProcess && approvalProcess.initiatorUserId === userId;
    const isVndInitiator = vnd.createdByUserId !== null && vnd.createdByUserId === userId;

    // Редакция, по которой последний процесс согласования был отклонён - она вернулась в
    // черновик (как и после отзыва), и по одному approvalStatus не отличить "никогда не
    // отправлялась" от "отклонена, нужно доработать" - поэтому сверяемся с процессом.
    const rejectedRedactionId =
        approvalProcess?.status === "rejected" ? approvalProcess.redactionId : undefined;

    return {
        approvalProcess,
        approvalHistory,
        canGoToApproval: isApprovalParticipant || isApprovalInitiator || isVndInitiator,
        rejectedRedactionId,
    };
}
