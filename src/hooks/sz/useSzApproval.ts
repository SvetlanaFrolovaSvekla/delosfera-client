// Согласование записки глазами текущего пользователя: его активная задача, решение,
// подпись (квалифицированная и облачная) и устранение замечаний.
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {oepSigningService} from "@/service/signingService/oepSigningService.ts";
import {workflowService, type ResolutionType, type RouteInstance} from "@/service/workflowService/workflowService.ts";
import {szEcpService, type SzSignableResolution} from "@/service/szService/szEcpService.ts";
import {ecpCredentialService} from "@/service/ecpCredentialService.ts";
import {useEcpHashSigning} from "@/hooks/useEcpHashSigning.ts";
import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";
import {serverMessage} from "@/utils/szProcess/szCardUtils.ts";

/** Код ошибки проверки подписи от backend (ResolutionSignatureErrorCodes). */
function serverCode(e: unknown): string | undefined {
    return (e as { response?: { data?: { code?: string } } }).response?.data?.code;
}

interface Params {
    /** Записка — хэш резолюции для ЭЦП строит её backend. */
    szId: number | undefined;
    route: RouteInstance | null;
    setSaving: (value: boolean) => void;
    setError: (message: string | null) => void;
    setNotice: (message: string | null) => void;
    reload: () => Promise<void>;
}

export function useSzApproval({szId, route, setSaving, setError, setNotice, reload}: Params) {
    const {t} = useTranslation();
    const {user} = useAuth();
    const [comment, setComment] = useState("");

    /** ЭЦП ГП «Инфоком» — как у ВНД: сохранённая идентификация → сессия → окно ПИН/кода. */
    const ecp = useEcpHashSigning();

    /** Тестовый режим сервера (EcpSigning:AllowWithoutEcp): решения без ЭЦП разрешены. */
    const [allowWithoutEcp, setAllowWithoutEcp] = useState(false);
    /** Тестовая имитация ЭЦП только для СЗ (EcpSigning:AllowSzTestEcp). */
    const [allowSzTestEcp, setAllowSzTestEcp] = useState(false);
    useEffect(() => {
        szEcpService.testMode()
            .then((r) => setAllowSzTestEcp(r.allowSzTestEcp))
            .catch(() => setAllowSzTestEcp(false));
    }, []);
    useEffect(() => {
        ecpCredentialService.testMode()
            .then((r) => setAllowWithoutEcp(r.allowWithoutEcp))
            .catch(() => setAllowWithoutEcp(false));
    }, []);

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

    /**
     * Решение с подписью ЭЦП ГП «Инфоком». Хэш резолюции (решение + комментарий + содержимое
     * записки) строит backend; тот же хэш он пересчитает при сохранении и сверит с подписанным —
     * если записку или комментарий успели изменить, ответит "document_changed" и попросит подписать
     * заново. Подписываются все решения: и "Согласовать", и замечания, и отклонение.
     */
    const signAndResolve = async (type: SzSignableResolution) => {
        if (!myParticipant || szId === undefined) return;
        const text = comment.trim();
        if ((type === "ApprovedWithRemarks" || type === "Rejected") && !text) {
            setError(t("szCard.approval.commentRequired"));
            return;
        }

        setError(null);
        setNotice(null);
        const participantId = myParticipant.id;

        let signature: ResolutionEcpSignature;
        try {
            signature = await ecp.requestSignature({
                getHash: async () => (await szEcpService.getResolutionHash(szId, participantId, type, text)).hash,
                signStored: () => szEcpService.signStored(szId, participantId, type, text),
            });
        } catch (e) {
            // Окно подписи закрыли — это не ошибка, просто решение не отправлено.
            if (e instanceof Error && e.message === "Подписание отменено") return;
            setError(serverMessage(e) ?? t("szCard.approval.ecpSignFailed"));
            return;
        }

        setSaving(true);
        try {
            await szEcpService.resolve(szId, participantId, type, text, signature);
            setComment("");
            setNotice(t("szCard.approval.decisionMadeEcp", {decision: t(`szCard.resolution.${type}`).toLowerCase()}));
            await reload();
        } catch (e) {
            const code = serverCode(e);
            // Подпись чужая / учётка привязана к другой ЭЦП — сбрасываем сессию, чтобы в следующий
            // раз открылось окно с вводом ПИН, а не подписалось снова тем же токеном.
            if (code === "identity_mismatch") ecp.resetSession();
            setError(code === "document_changed"
                ? t("szCard.approval.ecpDocumentChanged")
                : serverMessage(e) ?? t("szCard.approval.decisionFailed"));
        } finally {
            setSaving(false);
        }
    };

    /** ТЕСТ: решение с имитацией ЭЦП (сервер: EcpSigning:AllowSzTestEcp) — без окна ПИН/кода и без ГП. */
    const testSignAndResolve = async (type: SzSignableResolution) => {
        if (!myParticipant || szId === undefined) return;
        const text = comment.trim();
        if ((type === "ApprovedWithRemarks" || type === "Rejected") && !text) {
            setError(t("szCard.approval.commentRequired"));
            return;
        }
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            await szEcpService.resolveTest(szId, myParticipant.id, type, text);
            setComment("");
            setNotice(t("szCard.approval.decisionMadeTestEcp", {decision: t(`szCard.resolution.${type}`).toLowerCase()}));
            await reload();
        } catch (e) {
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
        resolve, signAndResolve, testSignAndResolve, confirmRemark, ecp, allowWithoutEcp, allowSzTestEcp,
        qualifiedDialogOpen, setQualifiedDialogOpen, oepModalOpen, setOepModalOpen, oepAvailable,
    };
}

export type SzApprovalState = ReturnType<typeof useSzApproval>;
