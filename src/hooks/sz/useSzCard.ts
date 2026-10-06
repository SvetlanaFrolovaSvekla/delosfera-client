// Состояние и действия карточки служебной записки: загрузка, форма, сохранение,
// отправка, регистрация, отзыв и ручной перевод статуса. Согласование — в useSzApproval.
import {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {attachmentService} from "@/service/documentService/attachmentService.ts";
import {workflowService, type RouteInstance} from "@/service/workflowService/workflowService.ts";
import {
    hrForms as szHrForms,
    szService,
    type HrFormSchema,
    type SzDetails,
    type SzHrKind,
    type SzKind,
    type SzSaveRequest,
    type SzStatusCode,
} from "@/service/szService/szService.ts";
import {EDITABLE_STATUSES, formatDate, serverMessage} from "@/components/componentsSzCard/szCardUtils.ts";

const EMPTY_FORM: SzSaveRequest = {
    title: "", kindId: 0, body: "", correspondentUnitId: null, rubricIds: [],
    addresseeUserId: null, signerUserId: null, approverUserIds: [], approvalIsParallel: false,
};

export function useSzCard(id: string | undefined) {
    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const {user, hasPermission} = useAuth();
    const isNew = !id;

    const [kinds, setKinds] = useState<SzKind[]>([]);
    const [hrKinds, setHrKinds] = useState<SzHrKind[]>([]);

    /** Схема полей по видам кадровых записок — приходит с сервера один раз. */
    const [hrForms, setHrForms] = useState<Record<string, HrFormSchema>>({});

    /** Общие значения полей вида: те, что не заполняются по каждому сотруднику. */
    const [hrValues, setHrValues] = useState<Record<string, unknown>>({});
    const [sz, setSz] = useState<SzDetails | null>(null);
    const [route, setRoute] = useState<RouteInstance | null>(null);
    const [form, setForm] = useState<SzSaveRequest>(EMPTY_FORM);

    /**
     * Отложенные вложения мастера создания: пока записки нет, файлы копятся здесь
     * и уходят на сервер сразу после её создания. Иначе поле вложений на /sz/new
     * молча неактивно — приложить файл к новой записке было нельзя.
     */
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [approversFromTemplate, setApproversFromTemplate] = useState(false);

    // i18n.t, а не t: он не меняется при смене языка, и справочники не перезагружаются.
    useEffect(() => {
        void szHrForms().then(setHrForms).catch(() => undefined);

        Promise.all([szService.kinds(), szService.hrKinds()])
            .then(([k, hr]) => {
                setKinds(k);
                setHrKinds(hr);
                setForm((f) => (f.kindId === 0 && k.length ? {...f, kindId: k[0].id} : f));
            })
            .catch(() => setError(i18n.t("szCard.loadKindsError")));
    }, [i18n]);

    const applyDetails = useCallback((d: SzDetails) => {
        setSz(d);
        setForm({
            title: d.title, kindId: d.kindId, body: d.body,
            correspondentUnitId: d.correspondentUnitId, isPaperCarrier: d.isPaperCarrier,
            rubricIds: d.rubricIds,
            addresseeUserId: d.addresseeUserId,
            signerUserId: d.signerUserId,
            approverUserIds: d.approvers.map((a) => a.userId),
            approvalIsParallel: d.approvalIsParallel,
            hrKindId: d.hrKindId, employeeName: d.employeeName,
            employeeUnitId: d.employeeUnitId, transferUnitId: d.transferUnitId,
            hasBudget: d.hasBudget, amount: d.amount, travelExpenses: d.travelExpenses,
            employees: d.employees ?? [],
        });

        // Маршрут нужен и после завершения: карточка показывает, кто и как решил.
        if (d.currentRouteInstanceId) {
            workflowService.instance(d.currentRouteInstanceId).then(setRoute).catch(() => setRoute(null));
        } else {
            setRoute(null);
        }
    }, []);

    const reload = useCallback(async () => {
        if (isNew || !id) return;
        const d = await szService.get(Number(id));
        applyDetails(d);
    }, [id, isNew, applyDetails]);

    useEffect(() => {
        if (isNew) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        szService.get(Number(id))
            .then(applyDetails)
            .catch(() => setError(i18n.t("szCard.loadError")))
            .finally(() => setLoading(false));
    }, [id, isNew, applyDetails, i18n]);

    const kind = useMemo(() => kinds.find((k) => k.id === form.kindId), [kinds, form.kindId]);
    const formKey = kind?.formKey ?? "Other";

    // Правка доступна автору, пока записка не ушла дальше него: согласующий,
    // открывший карточку, редактировать текст записки не должен.
    const isAuthor = !!sz && !!user && sz.authorId === user.id;
    const editable = isNew || (isAuthor && !!sz && EDITABLE_STATUSES.includes(sz.statusCode));

    // Ручной перевод статуса — администратору системы. Записка застревает по
    // причинам вне системы: уволился согласующий, маршрут собрали не так. Без
    // этой возможности такие записки правят прямо в базе.
    const canForceStatus = hasPermission(PermissionCode.ManageSystemSettings);

    const set = <K extends keyof SzSaveRequest>(key: K, value: SzSaveRequest[K]) =>
        setForm((f) => ({...f, [key]: value}));

    // При выборе вида подставляем согласующих из его шаблона (админ настраивает
    // маршрут на вид). Состав можно поправить руками — это подсказка, а не жёсткий
    // список. Работает для черновика/новой записки, где согласующих ещё задают.
    const applyKind = async (newKindId: number) => {
        set("kindId", newKindId);
        setApproversFromTemplate(false);
        if (!editable || !newKindId) return;
        try {
            const preview = await szService.previewApprovers(
                newKindId, form.correspondentUnitId ?? undefined);
            if (preview.length > 0) {
                setForm((f) => ({...f, kindId: newKindId, approverUserIds: preview.map((p) => p.userId)}));
                setApproversFromTemplate(true);
            }
        } catch {
            // Шаблон не настроен или сеть — молча оставляем ручной выбор.
        }
    };

    const save = async () => {
        if (!form.title.trim() || !form.kindId) {
            setError(t("szCard.errors.titleRequired"));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const saved = isNew
                ? await szService.create(form)
                : await szService.update(Number(id), form);

            // Записка создана — файлы, собранные в мастере, цепляются к её карточке.
            // Сбой загрузки записку не отменяет: недостающий файл прикладывается на
            // карточке, куда мы и уходим, назвав, что не прошло.
            const failed: string[] = [];
            if (isNew && pendingFiles.length) {
                for (const file of pendingFiles) {
                    try {
                        await attachmentService.upload(saved.documentId, file);
                    } catch {
                        failed.push(file.name);
                    }
                }
                setPendingFiles([]);
            }

            applyDetails(saved);
            setNotice(failed.length
                ? t("szCard.notices.savedFilesFailed", {files: failed.join(", ")})
                : t("szCard.notices.saved"));
            if (isNew) navigate(`/sz/${saved.id}`, {replace: true});
        } catch {
            setError(t("szCard.errors.saveFailed"));
        } finally {
            setSaving(false);
        }
    };

    const runAction = async (action: "submit" | "register" | "delete") => {
        if (!sz) return;
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            if (action === "delete") {
                await szService.remove(sz.id);
                navigate("/sz");
                return;
            }
            const updated = action === "submit"
                ? await szService.submit(sz.id)
                : await szService.register(sz.id);

            // Ответ описывает записку, но маршрут создаётся тем же действием, и
            // ссылка на него может ещё не попасть в ответ. Перечитываем карточку,
            // иначе лист согласования появится только после перезагрузки страницы.
            applyDetails(updated);
            await reload();
            setNotice(action === "submit"
                ? t(updated.statusCode === "PendingRegistration"
                    ? "szCard.notices.sentToRegistration"
                    : "szCard.notices.sentToApproval")
                : t("szCard.notices.registered", {
                    regNumber: updated.regNumber,
                    dueDate: formatDate(updated.dueDate),
                }));
        } catch (e) {
            // Сервер объясняет отказ по существу: не выбран согласующий, не задан
            // маршрут, записка не в том статусе. Подменяя это общей фразой, мы
            // заставляем человека гадать и звать разработчика — что и произошло.
            setError(serverMessage(e) ?? t(action === "submit"
                ? "szCard.actions.submitFailed"
                : "szCard.actions.registerFailed"));
        } finally {
            setSaving(false);
        }
    };

    /** Отзыв записки; true — отозвана и панель отзыва можно закрыть. */
    const withdraw = async (reason: string): Promise<boolean> => {
        if (!sz) return false;
        if (!reason.trim()) {
            setError(t("szCard.withdraw.reasonRequired"));
            return false;
        }
        setSaving(true);
        setError(null);
        try {
            const updated = await szService.withdraw(sz.id, reason.trim());
            applyDetails(updated);
            await reload();
            setNotice(t("szCard.withdraw.done"));
            return true;
        } catch {
            setError(t("szCard.withdraw.failed"));
            return false;
        } finally {
            setSaving(false);
        }
    };

    /** Ручной перевод статуса; true — переведена и панель можно закрыть. */
    const forceStatus = async (code: SzStatusCode, reason: string): Promise<boolean> => {
        if (!sz || !reason.trim()) return false;
        setSaving(true);
        setError(null);
        try {
            applyDetails(await szService.forceStatus(sz.id, code, reason.trim()));
            setNotice(t("szCard.force.done", {status: t(`szRegistry.status.${code}`)}));
            return true;
        } catch (e) {
            setError(serverMessage(e) ?? t("szCard.force.failed"));
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        isNew, sz, form, setForm, set, kind, formKey, kinds, hrKinds, hrForms, hrValues, setHrValues,
        pendingFiles, setPendingFiles, loading, saving, setSaving, error, setError, notice, setNotice,
        route, isAuthor, editable, canForceStatus, approversFromTemplate,
        applyKind, applyDetails, reload, save, runAction, withdraw, forceStatus,
    };
}

export type SzCardState = ReturnType<typeof useSzCard>;
