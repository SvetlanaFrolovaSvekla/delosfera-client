// Согласование записки глазами текущего пользователя: его активная задача, решение,
// подпись (квалифицированная и облачная) и устранение замечаний.
import {useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {oepSigningService} from "@/service/signingService/oepSigningService.ts";
import {workflowService, type ResolutionType, type RouteInstance} from "@/service/workflowService/workflowService.ts";
import {szEcpService, type SzSignableResolution} from "@/service/szService/szEcpService.ts";
import {ecpCredentialService} from "@/service/ecpCredentialService.ts";
import {useEcpHashSigning} from "@/hooks/useEcpHashSigning.ts";
import type {ResolutionEcpSignature} from "@/hooks/useEcpApproval.ts";
import {toast} from "@/service/toastService.ts";
import {serverMessage} from "@/utils/szProcess/szCardUtils.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

/** Код ошибки проверки подписи от backend (ResolutionSignatureErrorCodes). */
function serverCode(e: unknown): string | undefined {
    return (e as { response?: { data?: { code?: string } } }).response?.data?.code;
}

interface Params {
    /** Записка — хэш резолюции для ЭЦП строит её backend. */
    szId: number | undefined;
    route: RouteInstance | null;
    /** За кого пользователь действует по замещению (GEN-14) — их этапы тоже его. */
    actingForUserIds?: number[];
    setSaving: (value: boolean) => void;
    setError: (message: string | null) => void;
    setNotice: (message: string | null) => void;
    reload: () => Promise<void>;
}

export function useSzApproval({szId, route, actingForUserIds, setSaving, setError, setNotice, reload}: Params) {
    const {t} = useTranslation();
    const {user, hasPermission} = useAuth();
    const [comment, setCommentValue] = useState("");
    /** Не заполнен обязательный комментарий (замечания / отклонение) — поле подсвечивается красным. */
    const [commentError, setCommentError] = useState<string | null>(null);
    const commentRef = useRef<HTMLTextAreaElement>(null);

    const setComment = (value: string) => {
        setCommentValue(value);
        if (commentError && value.trim()) setCommentError(null);
    };

    /** Для замечаний и отклонения комментарий обязателен: показываем ошибку у поля, тост и ставим в него фокус. */
    const requireComment = (type: ResolutionType, text: string): boolean => {
        if ((type !== "ApprovedWithRemarks" && type !== "Rejected") || text) return true;
        const message = t("szCard.approval.commentRequired");
        setCommentError(message);
        setError(message);
        commentRef.current?.scrollIntoView({behavior: "smooth", block: "center"});
        commentRef.current?.focus({preventScroll: true});
        return false;
    };

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
    /** На сервере задан ключ локальной подписи «Делосфера» (SystemSeal:HmacKey). */
    const [systemSealConfigured, setSystemSealConfigured] = useState(true);
    useEffect(() => {
        ecpCredentialService.testMode()
            .then((r) => {
                setAllowWithoutEcp(r.allowWithoutEcp);
                setSystemSealConfigured(r.systemSealConfigured !== false);
            })
            .catch(() => setAllowWithoutEcp(false));
    }, []);

    /**
     * Подпись без ЭЦП КР (право SignWithoutNationalEcp — сотрудники без гражданства КР), как у ВНД:
     * основные кнопки решения открывают окно подтверждения, и резолюцию подписывает система «Делосфера»
     * вместо ПИН/кода ГП «Инфоком». Хэш, показанный в окне, сервер пересчитает и сверит.
     */
    const systemSignMode = hasPermission(PermissionCode.SignWithoutNationalEcp);
    const [pendingSystem, setPendingSystem] = useState<SzSignableResolution | null>(null);
    const [systemHash, setSystemHash] = useState<string | null>(null);
    const [systemHashLoading, setSystemHashLoading] = useState(false);
    const [systemHashError, setSystemHashError] = useState<string | null>(null);

    /** Открыто окно подписания: этап требует квалифицированной подписи. */
    const [qualifiedDialogOpen, setQualifiedDialogOpen] = useState(false);

    /** Открыто окно облачной ЭП (ОЭП) + доступна ли интеграция на контуре. */
    const [oepModalOpen, setOepModalOpen] = useState(false);
    const [oepAvailable, setOepAvailable] = useState(false);
    useEffect(() => {
        oepSigningService.status().then(setOepAvailable).catch(() => setOepAvailable(false));
    }, []);

    /**
     * Активная задача согласования текущего пользователя по этой записке — своя или
     * того, кого он замещает (GEN-14): визу замещающего сервер принимает, и без этого
     * он видел задачу в реестре, а в карточке не находил кнопок. Своя — в приоритете.
     */
    const myParticipant = useMemo(() => {
        if (!route || !user) return null;
        const actors = [user.id, ...(actingForUserIds ?? [])];
        for (const actor of actors) {
            for (const step of route.steps) {
                const p = step.participants.find((x) => x.userId === actor && x.state === "Active");
                if (p) return p;
            }
        }
        return null;
    }, [route, user, actingForUserIds]);

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
        if (!requireComment(type, comment.trim())) return;

        // Отклонение и возврат на доработку ничего не удостоверяют — под ними подпись
        // не нужна, и требовать её значило бы мешать остановить процесс.
        if (needsQualified && type === "Approved" && signatureId === undefined) {
            setQualifiedDialogOpen(true);
            return;
        }

        setSaving(true);
        setError(null);
        setNotice(null);
        setCommentError(null);
        try {
            await workflowService.resolve(myParticipant.id, type, comment.trim() || undefined, signatureId);
            setComment("");
            toast.success(t("szCard.approval.decisionMade", {decision: t(`szCard.resolution.${type}`).toLowerCase()}),
                {size: "large", duration: 6000});
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
        if (!requireComment(type, text)) return;

        setError(null);
        setNotice(null);
        setCommentError(null);
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
            toast.success(t("szCard.approval.decisionMadeEcp", {decision: t(`szCard.resolution.${type}`).toLowerCase()}),
                {size: "large", duration: 6000});
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
        if (!requireComment(type, text)) return;
        setSaving(true);
        setError(null);
        setNotice(null);
        setCommentError(null);
        try {
            await szEcpService.resolveTest(szId, myParticipant.id, type, text);
            setComment("");
            toast.success(t("szCard.approval.decisionMadeTestEcp", {decision: t(`szCard.resolution.${type}`).toLowerCase()}),
                {size: "large", duration: 6000});
            await reload();
        } catch (e) {
            setError(serverMessage(e) ?? t("szCard.approval.decisionFailed"));
        } finally {
            setSaving(false);
        }
    };

    /** Подпись без ЭЦП КР: проверить комментарий, получить хэш резолюции и открыть окно подтверждения. */
    const openSystemConfirm = (type: SzSignableResolution) => {
        if (!myParticipant || szId === undefined) return;
        const text = comment.trim();
        if (!requireComment(type, text)) return;
        setError(null);
        setNotice(null);
        setCommentError(null);
        setPendingSystem(type);
        setSystemHash(null);
        setSystemHashError(null);
        setSystemHashLoading(true);
        szEcpService.getResolutionHash(szId, myParticipant.id, type, text)
            .then((r) => setSystemHash(r.hash))
            .catch((e) => setSystemHashError(serverMessage(e) ?? t("resolutionPanel.systemSign.hashError")))
            .finally(() => setSystemHashLoading(false));
    };

    /** Подтверждено в окне — резолюцию подписывает система «Делосфера». */
    const confirmSystemSign = async () => {
        const type = pendingSystem;
        if (!type || !systemHash || !myParticipant || szId === undefined) return;
        setPendingSystem(null);
        setSaving(true);
        try {
            await szEcpService.resolveSystem(szId, myParticipant.id, type, comment.trim(), systemHash);
            setComment("");
            toast.success(t("szCard.approval.decisionMadeSystem", {decision: t(`szCard.resolution.${type}`).toLowerCase()}),
                {size: "large", duration: 6000});
            await reload();
        } catch (e) {
            setError(serverCode(e) === "document_changed"
                ? t("szCard.approval.ecpDocumentChanged")
                : serverMessage(e) ?? t("szCard.approval.decisionFailed"));
        } finally {
            setSaving(false);
        }
    };

    const confirmRemark = async (remarkId: number): Promise<boolean> => {
        setSaving(true);
        setError(null);
        try {
            await workflowService.confirmRemark(remarkId);
            await reload();
            // Маршрут идёт дальше, когда устранены все замечания; пока есть открытые — говорим, сколько осталось.
            const left = openRemarks.filter((r) => r.id !== remarkId).length;
            if (left === 0) {
                toast.success(t("szCard.remarks.movedOnTitle"), t("szCard.remarks.movedOnText"));
            } else {
                toast.info(t("szCard.remarks.stillOpenTitle"), t("szCard.remarks.stillOpenText", {count: left}));
            }
            return true;
        } catch {
            setError(t("szCard.remarks.confirmFailed"));
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        comment, setComment, commentError, commentRef, myParticipant, isSigningStep, needsQualified, openRemarks,
        resolve, signAndResolve, testSignAndResolve, confirmRemark, ecp, allowWithoutEcp, allowSzTestEcp,
        systemSignMode, systemSealConfigured, pendingSystem, setPendingSystem, systemHash, systemHashLoading,
        systemHashError, openSystemConfirm, confirmSystemSign,
        qualifiedDialogOpen, setQualifiedDialogOpen, oepModalOpen, setOepModalOpen, oepAvailable,
    };
}

export type SzApprovalState = ReturnType<typeof useSzApproval>;
