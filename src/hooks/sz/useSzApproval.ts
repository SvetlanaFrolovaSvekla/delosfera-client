// Согласование записки глазами текущего пользователя: его активная задача, решение,
// подпись (квалифицированная и облачная) и устранение замечаний.
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {oepSigningService} from "@/service/signingService/oepSigningService.ts";
import {workflowService, type ResolutionType, type RouteInstance} from "@/service/workflowService/workflowService.ts";
import {serverMessage} from "@/components/componentsSzCard/szCardUtils.ts";

interface Params {
    route: RouteInstance | null;
    setSaving: (value: boolean) => void;
    setError: (message: string | null) => void;
    setNotice: (message: string | null) => void;
    reload: () => Promise<void>;
}

export function useSzApproval({route, setSaving, setError, setNotice, reload}: Params) {
    const {t} = useTranslation();
    const {user} = useAuth();
    const [comment, setComment] = useState("");

    /** Открыто окно подписания: этап требует квалифицированной подписи. */
    const [qualifiedDialogOpen, setQualifiedDialogOpen] = useState(false);

    /** Открыто окно облачной ЭП (ОЭП) + доступна ли интеграция на контуре. */
    const [oepModalOpen, setOepModalOpen] = useState(false);
    const [oepAvailable, setOepAvailable] = useState(false);
    useEffect(() => {
        oepSigningService.status().then(setOepAvailable).catch(() => setOepAvailable(false));
    }, []);

    /** Активная задача согласования текущего пользователя по этой записке. */
    const myParticipant = useMemo(() => {
        if (!route || !user) return null;
        for (const step of route.steps) {
            const p = step.participants.find((x) => x.userId === user.id && x.state === "Active");
            if (p) return p;
        }
        return null;
    }, [route, user]);

    const myStep = useMemo(() => {
        if (!route || !myParticipant) return null;
        return route.steps.find((s) => s.participants.some((p) => p.id === myParticipant.id)) ?? null;
    }, [route, myParticipant]);

    /**
     * Этап подписания отличается от согласования по существу: подписант ставит
     * подпись под текстом, с которым согласующие уже согласились, и «замечаний»
     * у него быть не может — либо подписывает, либо возвращает на доработку.
     */
    const isSigningStep = myStep?.kind === "Signing";

    /**
     * Этап может требовать квалифицированной подписи. Тогда решение не отправляется
     * сразу: сначала подписант ставит подпись криптопровайдером, и только потом её
     * идентификатор уходит вместе с решением. Иначе сервер отказал бы — и правильно
     * сделал бы, но человек не понял бы, чего от него хотят.
     */
    const needsQualified = myStep?.requiredSignatureLevel === "Qualified";

    /** Открытые замечания — их устраняет инициатор, после чего маршрут идёт с того же этапа. */
    const openRemarks = useMemo(() => {
        if (!route) return [];
        return route.steps.flatMap((s) => s.participants).flatMap((p) =>
            (p.resolution?.remarks ?? [])
                .filter((r) => r.state === "Open")
                .map((r) => ({...r, userId: p.userId})));
    }, [route]);

    const resolve = async (type: ResolutionType, signatureId?: number) => {
        if (!myParticipant) return;
        if ((type === "ApprovedWithRemarks" || type === "Rejected") && !comment.trim()) {
            setError(t("szCard.approval.commentRequired"));
            return;
        }

        // Отклонение и возврат на доработку ничего не удостоверяют — под ними подпись
        // не нужна, и требовать её значило бы мешать остановить процесс.
        if (needsQualified && type === "Approved" && signatureId === undefined) {
            setQualifiedDialogOpen(true);
            return;
        }

        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            await workflowService.resolve(myParticipant.id, type, comment.trim() || undefined, signatureId);
            setComment("");
            setNotice(t("szCard.approval.decisionMade", {decision: t(`szCard.resolution.${type}`).toLowerCase()}));
            await reload();
        } catch (e) {
            // Сервер отказывает по существу — не принят регламент подписи, решение
            // выносит другой человек, изменился документ. Общее «не удалось»
            // спрятало бы причину, и человек не понял бы, что делать.
            setError(serverMessage(e) ?? t("szCard.approval.decisionFailed"));
        } finally {
            setSaving(false);
        }
    };

    const confirmRemark = async (remarkId: number) => {
        setSaving(true);
        setError(null);
        try {
            await workflowService.confirmRemark(remarkId);
            setNotice(t("szCard.remarks.confirmed"));
            await reload();
        } catch {
            setError(t("szCard.remarks.confirmFailed"));
        } finally {
            setSaving(false);
        }
    };

    return {
        comment, setComment, myParticipant, isSigningStep, needsQualified, openRemarks,
        resolve, confirmRemark,
        qualifiedDialogOpen, setQualifiedDialogOpen, oepModalOpen, setOepModalOpen, oepAvailable,
    };
}

export type SzApprovalState = ReturnType<typeof useSzApproval>;
