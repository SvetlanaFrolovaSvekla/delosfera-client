// Общая логика запуска актуализации ВНД - используется и во вкладке «Актуализация»,
// и в сайдбаре редакций (кнопка «Начать актуализацию» / плашка о заявке / кнопка «Выполнить
// актуализацию»). Инкапсулирует права, состояние модалок Start/Request/Approve/Perform и статус
// собственной заявки текущего пользователя по этому документу.
import {useMemo, useState} from "react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {actualizationService} from "@/service/actualizationService/actualizationService.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {VndActualizationRequestResponse} from "@/service/actualizationService/actualizationServiceTypes.ts";
import {useVndActualizationRequests} from "@/hooks/vndHooks/useVndActualizationRequests.ts";

export type VndMyActualizationAccessState =
    | { kind: "none" }
    | { kind: "pending"; requestId: number }
    | { kind: "approved"; requestId: number; decidedByName: string | null; shiftNextPeriod: boolean };

export function useVndActualizationFlow(vnd: VndResponse, onVndChanged: () => void) {
    const {user, hasPermission} = useAuth();

    const canWithoutApproval = hasPermission(PermissionCode.ActualizeAnyVndWithoutApproval);
    const canWithApproval = hasPermission(PermissionCode.ActualizeAnyVndWithApproval);
    const canDirectly = canWithoutApproval || canWithApproval;

    // Единое определение "главный редактор" — зеркалит бэковый VndActualizationService.IsChiefEditor()
    // (шире, чем просто ActualizeAnyVnd...: пользователь с правом создавать ВНД тоже действует
    // как главный редактор).
    const isChiefEditor =
        hasPermission(PermissionCode.CreateVndWithApproval) ||
        hasPermission(PermissionCode.CreateVndWithoutApproval) ||
        canDirectly;

    const canRequestWithApproval = hasPermission(PermissionCode.ActualizeVndWithApprovalByRequest);
    const canRequestWithoutApproval = hasPermission(PermissionCode.ActualizeVndWithoutApprovalByRequest);
    const canByRequest = canRequestWithApproval || canRequestWithoutApproval;

    const {data: requests, refetch: refetchRequests} = useVndActualizationRequests(vnd.id);

    // Самая свежая заявка текущего пользователя по этому ВНД (любого статуса)
    const myLatestRequest = useMemo(() => {
        if (!user) return undefined;
        return [...requests]
            .filter((r) => r.requestedByUserId === user.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }, [requests, user]);

    // ВАЖНО: одобренная, но уже ИСПОЛЬЗОВАННАЯ (consumedAt != null) заявка не должна больше
    // считаться "моей активной" — иначе после завершения полного цикла актуализации пользователь
    // не может отправить новую заявку, а старое сообщение "Заявка одобрена…" продолжает
    // показываться (баг: 409 "Нет одобренной и ещё не использованной заявки…" при повторной
    // заявке — раньше эта проверка отсутствовала, и то же значение считалось вечно "approved").
    const myAccessState: VndMyActualizationAccessState = useMemo(() => {
        if (!myLatestRequest) return {kind: "none"};
        if (myLatestRequest.status === "pending") return {kind: "pending", requestId: myLatestRequest.id};
        if (myLatestRequest.status === "approved" && !myLatestRequest.consumedAt) {
            return {
                kind: "approved",
                requestId: myLatestRequest.id,
                decidedByName: myLatestRequest.decidedByName,
                shiftNextPeriod: myLatestRequest.shiftNextPeriod,
            };
        }
        return {kind: "none"}; // отклонена, либо одобрена и уже использована — можно подать новую заявку
    }, [myLatestRequest]);

    const [startOpen, setStartOpen] = useState(false);
    const [requestOpen, setRequestOpen] = useState(false);
    const [performOpen, setPerformOpen] = useState(false);
    const [approveTarget, setApproveTarget] = useState<VndActualizationRequestResponse | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStart = async (data: { requiresApproval: boolean; responsibleUserId: number }) => {
        setSubmitting(true);
        setError(null);
        try {
            await actualizationService.start(vnd.id, {
                requiresApproval: data.requiresApproval,
                responsibleUserId: data.responsibleUserId,
            });
            setStartOpen(false);
            onVndChanged();
            refetchRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось начать актуализацию");
        } finally {
            setSubmitting(false);
        }
    };

    const handleRequestAccess = async (data: { requiresApproval: boolean; shiftNextPeriod: boolean }) => {
        setSubmitting(true);
        setError(null);
        try {
            await actualizationService.requestAccess(vnd.id, {
                requiresApproval: data.requiresApproval,
                shiftNextPeriod: data.shiftNextPeriod,
            });
            setRequestOpen(false);
            refetchRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось отправить заявку");
        } finally {
            setSubmitting(false);
        }
    };

    // Шаг "Выполнить актуализацию" — какой эндпоинт вызвать, однозначно определяется текущим
    // статусом документа: "onact" (цикл уже начат напрямую главредом, ActualizationPerformed
    // ещё false) → perform; "active" (у меня одобренная заявка, цикл ещё не стартовал) →
    // confirmStart, который сам совмещает старт цикла и этот шаг.
    const performMode: "direct" | "afterRequest" = vnd.status === "onact" ? "direct" : "afterRequest";

    const handlePerformConfirm = async (data: { shiftNextPeriod: boolean; plannedNoChanges: boolean }) => {
        setSubmitting(true);
        setError(null);
        try {
            if (performMode === "direct") {
                await actualizationService.perform(vnd.id, {
                    shiftNextPeriod: data.shiftNextPeriod,
                    plannedNoChanges: data.plannedNoChanges,
                });
            } else {
                await actualizationService.confirmStart(vnd.id, {plannedNoChanges: data.plannedNoChanges});
            }
            setPerformOpen(false);
            onVndChanged();
            refetchRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось выполнить актуализацию");
        } finally {
            setSubmitting(false);
        }
    };

    // Главный редактор одобряет заявку обычного редактора — с возможностью скорректировать
    // сдвиг срока (см. ApproveActualizationRequestModal). Сам старт цикла НЕ происходит здесь —
    // это отдельное действие заявителя (кнопка "Выполнить актуализацию" после одобрения).
    const [approvingRequestId, setApprovingRequestId] = useState<number | null>(null);
    const handleApproveRequest = async (requestId: number, shiftNextPeriod: boolean) => {
        setApprovingRequestId(requestId);
        setError(null);
        try {
            await actualizationService.decideRequest(requestId, {approve: true, shiftNextPeriod});
            setApproveTarget(null);
            refetchRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось одобрить заявку");
        } finally {
            setApprovingRequestId(null);
        }
    };

    const handleRejectRequest = async (requestId: number) => {
        setApprovingRequestId(requestId);
        setError(null);
        try {
            await actualizationService.decideRequest(requestId, {approve: false});
            refetchRequests();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось отклонить заявку");
        } finally {
            setApprovingRequestId(null);
        }
    };

    // Нужно ли показать кнопку/шаг "Выполнить актуализацию" прямо сейчас — доступно назначенному
    // ответственному или любому главному редактору. Не показывается сама по себе как отдельный
    // экран - только сигнал для вызывающих компонентов (VndActualizationTab/RedactionsSidebar).
    const needsPerform =
        vnd.status === "onact" &&
        !vnd.actualizationPerformed &&
        (vnd.actualizationResponsibleUserId === user?.id || isChiefEditor);

    const needsConfirmStartAfterRequest = vnd.status === "active" && myAccessState.kind === "approved";

    return {
        canWithoutApproval, canWithApproval, canDirectly, isChiefEditor,
        canRequestWithApproval, canRequestWithoutApproval, canByRequest,
        startOpen, setStartOpen, requestOpen, setRequestOpen,
        performOpen, setPerformOpen, performMode,
        approveTarget, setApproveTarget,
        submitting, error, setError,
        handleStart, handleRequestAccess, handlePerformConfirm,
        myAccessState, requests, refetchRequests,
        handleApproveRequest, handleRejectRequest, approvingRequestId,
        needsPerform, needsConfirmStartAfterRequest,
    };
}
