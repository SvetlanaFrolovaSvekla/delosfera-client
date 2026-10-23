// Состояние и действия карточки служебной записки: загрузка, форма, сохранение,
// отправка, регистрация, отзыв и ручной перевод статуса. Согласование — в useSzApproval.
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {attachmentService} from "@/service/documentService/attachmentService.ts";
import {toast} from "@/service/toastService.ts";
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
import {EDITABLE_STATUSES, formatDate, serverMessage} from "@/utils/szProcess/szCardUtils.ts";

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
    /** Маршрут есть, но загрузить его не удалось — блок согласования показывает причину, а не исчезает. */
    const [routeError, setRouteError] = useState<string | null>(null);
    const [form, setForm] = useState<SzSaveRequest>(EMPTY_FORM);

    /**
     * Отложенные вложения мастера создания: пока записки нет, файлы копятся здесь
     * и уходят на сервер сразу после её создания. Иначе поле вложений на /sz/new
     * молча неактивно — приложить файл к новой записке было нельзя.
     */
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [error, setErrorState] = useState<string | null>(null);
    /** Любая ошибка страницы показывается и плашкой над формой, и всплывающим тостом. */
    const setError = useCallback((message: string | null) => {
        setErrorState(message);
        if (message) toast.error(message);
    }, []);
    const [notice, setNotice] = useState<string | null>(null);
    const [approversFromTemplate, setApproversFromTemplate] = useState(false);

    /**
     * Форма в том виде, в каком она лежит на сервере. По ней «Отправить» понимает,
     * есть ли несохранённые правки: отправка берёт записку с сервера, и правки,
     * не сохранённые перед ней, раньше молча терялись.
     */
    const savedSnapshot = useRef<string | null>(null);

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
        const loaded: SzSaveRequest = {
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
            planItemId: d.planItemId,
            employees: d.employees ?? [],
        };
        setForm(loaded);
        savedSnapshot.current = snapshotOf(loaded, d.extraFields ?? {});

        // Общие поля кадровой записки лежат в extraFields. Раньше их не читали обратно,
        // и в форме после открытия карточки они были пустыми.
        setHrValues(d.extraFields ?? {});

        // Маршрут нужен и после завершения: карточка показывает, кто и как решил.
        if (d.currentRouteInstanceId) {
            setRouteError(null);
            workflowService.instance(d.currentRouteInstanceId)
                .then(setRoute)
                .catch((e: unknown) => {
                    // Раньше ошибка глоталась молча, и блок "Согласование" просто пропадал —
                    // согласующий не видел ни решения, ни причины.
                    console.error("[sz] не удалось загрузить маршрут согласования", e);
                    const r = (e as { response?: { status?: number; data?: { message?: string } } }).response;
                    setRouteError(r?.data?.message ?? (r?.status ? `HTTP ${r.status}` : String(e)));
                    setRoute(null);
                });
        } else {
            setRoute(null);
            setRouteError(null);
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
    // открывший карточку, редактировать текст записки не должен. Сектор
    // делопроизводства (право EditAnySz) правит чужую записку в тех же статусах —
    // поля и вложения — и может отправить её сам, например отозванную из-за
    // забытого файла.
    const isAuthor = !!sz && !!user && sz.authorId === user.id;
    // Администратор системы чинит застрявшие записки целиком: отзывает, правит
    // содержание и маршрут, отправляет снова — сервер пускает его так же.
    const isSystemAdmin = hasPermission(PermissionCode.ManageSystemSettings);
    const canEditAny = isSystemAdmin || hasPermission(PermissionCode.EditAnySz);
    // Отозвать чужую записку — отдельное право (WithdrawAnySz): прервать маршрут,
    // чтобы поправить записку, когда автора нет на месте.
    const canWithdrawAny = isSystemAdmin || hasPermission(PermissionCode.WithdrawAnySz);
    // Корректировка на согласовании (право CorrectSzOnApproval): правка полей и вложений без
    // отзыва — после подтверждения в модалке. Если изменится подписанное содержимое, а визы уже
    // есть, сервер начнёт согласование заново с первого этапа.
    const canCorrectOnApproval = !!sz && sz.statusCode === "OnApproval"
        && hasPermission(PermissionCode.CorrectSzOnApproval);
    const [correcting, setCorrecting] = useState(false);
    useEffect(() => { setCorrecting(false); }, [sz?.id, sz?.statusCode]);
    const editable = isNew
        || ((isAuthor || canEditAny) && !!sz && EDITABLE_STATUSES.includes(sz.statusCode))
        || (correcting && canCorrectOnApproval);
    // Согласующих, режим согласования и подписанта задаёт автор (и администратор —
    // починить маршрут): делопроизводство, правя чужую записку, меняет содержание,
    // но не круг согласующих. Сервер проверяет это же.
    const routeEditable = isNew || ((isAuthor || isSystemAdmin) && editable && !correcting);

    // Ручной перевод статуса — администратору системы. Записка застревает по
    // причинам вне системы: уволился согласующий, маршрут собрали не так. Без
    // этой возможности такие записки правят прямо в базе.
    const canForceStatus = hasPermission(PermissionCode.ManageSystemSettings);

    // Регистрировать записку (присвоить номер) — право Сектора делопроизводства.
    // Сервер проверяет его сам, но без этой проверки кнопку видел каждый, кто
    // открыл записку «на регистрации», и получал отказ уже после нажатия.
    const canRegister = hasPermission(PermissionCode.RegisterSz);

    const set = <K extends keyof SzSaveRequest>(key: K, value: SzSaveRequest[K]) =>
        setForm((f) => ({...f, [key]: value}));

    // При выборе вида подставляем согласующих из его шаблона (админ настраивает
    // маршрут на вид). Состав можно поправить руками — это подсказка, а не жёсткий
    // список. Работает для черновика/новой записки, где согласующих ещё задают.
    const applyKind = async (newKindId: number) => {
        set("kindId", newKindId);
        setApproversFromTemplate(false);
        if (!routeEditable || !newKindId) return;
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

    /**
     * Сохранить форму. quiet — без тоста об успехе: так сохраняют перед отправкой,
     * и об итоге сообщает уже сама отправка. Возвращает записку или null при сбое.
     */
    const save = async ({quiet = false}: { quiet?: boolean } = {}): Promise<SzDetails | null> => {
        if (!form.title.trim() || !form.kindId) {
            setError(t("szCard.errors.titleRequired"));
            return null;
        }
        setSaving(true);
        setError(null);
        try {
            // Общие поля кадровой записки (hrValues) живут отдельно от формы — раньше
            // они вообще не уходили на сервер и терялись при каждом сохранении.
            // Галочка «Бумажный носитель» показывает умолчание вида, пока её не трогали;
            // на сервер уходит то же значение, что видит человек.
            const shown: SzSaveRequest = {...form, isPaperCarrier: form.isPaperCarrier ?? kind?.isPaperByDefault ?? false};
            const payload: SzSaveRequest = formKey === "Hr" ? {...shown, extraFields: hrValues} : shown;
            const saved = isNew
                ? await szService.create(payload)
                : await szService.update(Number(id), payload);

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
            if (correcting) {
                // Круг перезапущен — маршрут новый: перечитываем карточку вместе с ним.
                const restarted = saved.approvalRounds > (sz?.approvalRounds ?? 0);
                setCorrecting(false);
                await reload();
                setNotice(null);
                toast.success(t(restarted ? "szCard.correction.restarted" : "szCard.notices.saved"));
                return saved;
            }
            // Итог сохранения — всплывающим уведомлением, а не строкой над формой:
            // что делать с запиской дальше, подсказывает плашка статуса (SzStatusBanner).
            setNotice(null);
            if (failed.length) {
                toast.warning(t("szCard.notices.saved"), t("szCard.notices.filesFailed", {files: failed.join(", ")}));
            } else if (!quiet) {
                toast.success(t("szCard.notices.saved"));
            }
            if (isNew) navigate(`/sz/${saved.id}`, {replace: true});
            return saved;
        } catch (e) {
            // Причину отказа называет сервер («Сумма не может быть отрицательной» и т.п.).
            setError(serverMessage(e) ?? t("szCard.errors.saveFailed"));
            return null;
        } finally {
            setSaving(false);
        }
    };

    const runAction = async (action: "submit" | "register" | "delete") => {
        if (!sz) return;

        // Отправка уносит записку в том виде, в каком она на сервере. Несохранённые
        // правки сначала сохраняем, а если сохранить не вышло — не отправляем вовсе:
        // уйти должно то, что автор видит на экране.
        if (action === "submit" && editable
            && savedSnapshot.current !== snapshotOf(form, hrValues)) {
            const saved = await save({quiet: true});
            if (!saved) return;
        }

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
            if (action === "submit") {
                // Отправка — всплывающим уведомлением, как и сохранение.
                toast.success(t(updated.statusCode === "PendingRegistration"
                    ? "szCard.notices.sentToRegistration"
                    : "szCard.notices.sentToApproval"));
            } else {
                // Регистрация — тоже всплывающим уведомлением, как и отправка.
                toast.success(t("szCard.notices.registered", {
                    regNumber: updated.regNumber,
                    dueDate: formatDate(updated.dueDate),
                }));
            }
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
        route, routeError, isAuthor, canEditAny, canWithdrawAny, editable, routeEditable, canForceStatus, canRegister, approversFromTemplate,
        applyKind, applyDetails, reload, save, runAction, withdraw, forceStatus,
        canCorrectOnApproval, correcting, setCorrecting,
        /** Вложения поменялись на согласовании — маршрут мог перезапуститься. */
        onAttachmentsChanged: () => { if (correcting) void reload(); },
    };
}

export type SzCardState = ReturnType<typeof useSzCard>;

/** Слепок формы для сравнения «есть ли несохранённые правки». */
function snapshotOf(form: SzSaveRequest, hrValues: Record<string, unknown>): string {
    return JSON.stringify({form, hrValues});
}
