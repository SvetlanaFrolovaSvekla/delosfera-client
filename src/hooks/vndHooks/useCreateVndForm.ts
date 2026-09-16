import {useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {vndService} from "@/service/vndService/vndService.ts";
import type {CreateVndRequest, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {
    organizationUnitService
} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";
import {useVndDictionaries} from "@/hooks/vndHooks/useVndDictionaries.ts";
import {useVndActualization} from "@/hooks/vndHooks/useVndActualization.ts";
import {CANNOT_CREATE_VND_MESSAGE, useCanCreateVnd} from "@/hooks/vndHooks/useCanCreateVnd.ts";
import {VND_TITLE_MAX_LENGTH, VND_TITLE_MIN_LENGTH} from "@/constants/validation/vndValidation.ts";
import {toast} from "@/service/toastService.ts";

export function useCreateVndForm() {
    const navigate = useNavigate();
    const actualization = useVndActualization();
    // Страница доступна по прямому URL любому авторизованному пользователю (не только
    // тому, кто пришёл сюда через "Создать ВНД"/"Далее" - там кнопки уже заблокированы),
    // поэтому право проверяем и здесь: иначе отправка формы дойдёт до бэкенда и упадёт
    // там сырой ошибкой авторизации вместо понятного сообщения.
    const canCreateVnd = useCanCreateVnd();

    // --- Все справочники разом (виды ВНД, органы утверждения, СП, ключевые слова, рубрики, секретность, группы)
    const dictionaries = useVndDictionaries();

    const [typeId, setTypeId] = useState("");
    const [organId, setOrganId] = useState<string | null>(null);

    const [titleRu, setTitleRuState] = useState("");
    const [titleKy, setTitleKyState] = useState("");
    const [titleEn, setTitleEnState] = useState("");

    const setTitleRu = (value: string) => setTitleRuState(value.slice(0, VND_TITLE_MAX_LENGTH));
    const setTitleKy = (value: string) => setTitleKyState(value.slice(0, VND_TITLE_MAX_LENGTH));
    const setTitleEn = (value: string) => setTitleEnState(value.slice(0, VND_TITLE_MAX_LENGTH));

    const [keywordIds, setKeywordIds] = useState<string[]>([]);
    const [rubricIds, setRubricIds] = useState<string[]>([]);
    const [secrecyLevelId, setSecrecyLevelId] = useState("");
    const [userGroupIds, setUserGroupIds] = useState<string[]>([]);

    // --- Разработчик (СП) - по умолчанию подставляется из подразделения текущего пользователя,
    // но теперь редактируется вручную (раньше поле было жёстко зафиксировано, см. историю) ---
    const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
    const [developerId, setDeveloperIdState] = useState("");
    const developerTouched = useRef(false);

    // Ответственные исполнители - редактируются пользователем
    const [responsibleExecutorIds, setResponsibleExecutorIdsState] = useState<string[]>([]);
    const executorsTouched = useRef(false);

    // Список СП с полными данными (включая headUserName) - нужен, чтобы показать начальника
    // ЛЮБОГО выбранного разработчика/исполнителя, а не только СП текущего пользователя.
    // dictionaries.orgUnitOptions (общий справочник) хранит только key/label без headUserName.
    const [orgUnits, setOrgUnits] = useState<OrganizationUnitResponse[]>([]);

    // Созданная ВНД
    const [createdVnd, setCreatedVnd] = useState<VndResponse | null>(null);

    const setDeveloperId = (value: string) => {
        developerTouched.current = true;
        setDeveloperIdState(value);
    };

    const setResponsibleExecutorIds = (values: string[]) => {
        executorsTouched.current = true;
        setResponsibleExecutorIdsState(values);
    };

    useEffect(() => {
        userService.getMe().then(setCurrentUser).catch(() => {
        });
        organizationUnitService.getAll().then(setOrgUnits).catch(() => {
        });
    }, []);

    // Разработчик по умолчанию подставляется из СП текущего пользователя - но только пока
    // пользователь не выбрал другое СП вручную (developerTouched), иначе прилёт currentUser
    // затирал бы уже сделанный выбор.
    useEffect(() => {
        if (!currentUser?.orgUnit) return;
        const autoId = String(currentUser.orgUnit.id);
        if (!developerTouched.current) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setDeveloperIdState(autoId);
        }
        if (!executorsTouched.current) {
            setResponsibleExecutorIdsState([autoId]);
        }
    }, [currentUser]);

    const developerName = useMemo(
        () => dictionaries.orgUnitOptions.find((u) => u.key === developerId)?.label ?? currentUser?.orgUnit?.name ?? "",
        [dictionaries.orgUnitOptions, developerId, currentUser]
    );

    // Начальник СП резолвится по фактически выбранному разработчику (через orgUnits), а не
    // жёстко по СП текущего пользователя, как было раньше - иначе после смены разработчика
    // подсказка продолжала бы показывать начальника СП пользователя, а не выбранного СП.
    const developerHeadName = useMemo(
        () => orgUnits.find((u) => String(u.id) === developerId)?.headUserName ?? null,
        [orgUnits, developerId]
    );

    const responsibleExecutorHeadNames = useMemo(
        () => responsibleExecutorIds
            .map((id) => orgUnits.find((u) => String(u.id) === id)?.headUserName)
            .filter((name): name is string => !!name),
        [orgUnits, responsibleExecutorIds]
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Список подписей незаполненных обязательных полей — источник и для isValid,
    // и для текста тултипа на неактивной кнопке "Создать черновик-карточку".
    const missingFieldLabels = useMemo(() => {
        const labels: string[] = [];
        if (typeId === "") labels.push("Вид документа");
        if (organId === null) labels.push("Орган утверждения");
        if (titleRu.trim().length < VND_TITLE_MIN_LENGTH) labels.push("Заголовок (рус.)");
        if (developerId === "") labels.push("Разработчик (СП)");
        if (responsibleExecutorIds.length === 0) labels.push("Ответственные исполнители");
        if (!actualization.isDateModeValid) labels.push("Дата актуализации");
        return labels;
    }, [typeId, organId, titleRu, developerId, responsibleExecutorIds, actualization.isDateModeValid]);

    const missingFieldsTooltip = !canCreateVnd
        ? CANNOT_CREATE_VND_MESSAGE
        : missingFieldLabels.length > 0
            ? `Заполните ${missingFieldLabels.length === 1 ? "поле" : "поля"}: «${missingFieldLabels.join("», «")}»`
            : "";

    const isValid = canCreateVnd && missingFieldLabels.length === 0;

    const handleSubmit = async () => {
        if (!isValid || isSubmitting) return;

        setSubmitError(null);
        setIsSubmitting(true);

        const payload: CreateVndRequest = {
            typeId: Number(typeId),
            organId: Number(organId),
            developerId: developerId ? Number(developerId) : undefined,
            responsibleExecutorIds: responsibleExecutorIds.map(Number),
            titleRu: titleRu.trim(),
            titleEn: titleEn.trim() || null,
            titleKg: titleKy.trim() || null,
            keywordIds: keywordIds.map(Number),
            rubricIds: rubricIds.map(Number),
            secrecyLevelId: secrecyLevelId ? Number(secrecyLevelId) : null,
            userGroupIds: userGroupIds.map(Number),
            period: actualization.backendPeriod,
            dueActualizationDate: actualization.dueActualizationDateForBackend,
        };

        try {
            const created = await vndService.create(payload);
            setCreatedVnd(created);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Не удалось создать ВНД";
            setSubmitError(message);
            toast.error("Не удалось создать черновик", message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSuccessModalDone = () => {
        if (createdVnd) {
            navigate(`/base-vnd/${createdVnd.id}`, {state: {vnd: createdVnd}});
        }
    };

    return {
        typeOptions: dictionaries.typeOptions.map((t) => ({value: t.key, label: t.label})),
        organOptions: dictionaries.organOptions,
        secrecyOptions: dictionaries.secrecyOptions,
        keywordOptions: dictionaries.keywordOptions,
        rubricOptions: dictionaries.rubricOptions,
        userGroupOptions: dictionaries.userGroupOptions,
        dictionariesLoading: dictionaries.loading,
        dictionariesError: dictionaries.error,

        typeId, setTypeId,
        organId, setOrganId,
        titleRu, setTitleRu,
        titleKy, setTitleKy,
        titleEn, setTitleEn,
        keywordIds, setKeywordIds,
        rubricIds, setRubricIds,
        secrecyLevelId, setSecrecyLevelId,
        userGroupIds, setUserGroupIds,

        developerId, setDeveloperId, developerName, developerHeadName,
        developerOptions: dictionaries.orgUnitOptions,
        executorOptions: dictionaries.orgUnitOptions,
        responsibleExecutorIds, setResponsibleExecutorIds, responsibleExecutorHeadNames,

        actualization,
        isValid, missingFieldLabels, missingFieldsTooltip, isSubmitting, submitError,
        handleSubmit,
        createdVnd, handleSuccessModalDone,
        goBack: () => navigate("/base-vnd"),
    };
}