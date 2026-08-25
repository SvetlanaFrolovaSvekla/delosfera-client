import {useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {vndService} from "@/service/vndService/vndService.ts";
import type {CreateVndRequest, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {userService} from "@/service/userService/userService.ts";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {useVndDictionaries} from "@/hooks/vndHooks/useVndDictionaries.ts";
import {useVndActualization} from "@/hooks/vndHooks/useVndActualization.ts";
import {VND_TITLE_MAX_LENGTH, VND_TITLE_MIN_LENGTH} from "@/constants/validation/vndValidation.ts";

export function useCreateVndForm() {
    const navigate = useNavigate();
    const actualization = useVndActualization();

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

    // --- Разработчик (СП) = подразделение текущего пользователя, не редактируется ---
    const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
    const [developerId, setDeveloperId] = useState("");

    // Ответственные исполнители - редактируются пользователем
    const [responsibleExecutorIds, setResponsibleExecutorIdsState] = useState<string[]>([]);
    const executorsTouched = useRef(false);

    // Созданная ВНД
    const [createdVnd, setCreatedVnd] = useState<VndResponse | null>(null);

    const setResponsibleExecutorIds = (values: string[]) => {
        executorsTouched.current = true;
        setResponsibleExecutorIdsState(values);
    };

    useEffect(() => {
        userService.getMe().then(setCurrentUser).catch(() => {
        });
    }, []);

    // Разработчик всегда подставляется автоматически из СП текущего пользователя
    useEffect(() => {
        if (!currentUser?.orgUnit) return;
        const autoId = String(currentUser.orgUnit.id);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDeveloperId(autoId);
        if (!executorsTouched.current) {
            setResponsibleExecutorIdsState([autoId]);
        }
    }, [currentUser]);

    const developerName = useMemo(
        () => dictionaries.orgUnitOptions.find((u) => u.key === developerId)?.label ?? currentUser?.orgUnit?.name ?? "",
        [dictionaries.orgUnitOptions, developerId, currentUser]
    );

    // headUserName в orgUnitOptions нет (там только key/label), поэтому берём его напрямую из currentUser для разработчика
    const developerHeadName = currentUser?.orgUnit?.headUserName ?? null;

    const responsibleExecutorHeadNames: string[] = [];
    // headUserName по исполнителям сейчас не резолвится через useVndDictionaries (там нет этого поля).
    // Если нужно — подключим organizationUnitService.getAll() отдельно, как раньше.

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const isValid =
        typeId !== "" &&
        organId !== null &&
        titleRu.trim().length >= VND_TITLE_MIN_LENGTH &&
        developerId !== "" &&
        responsibleExecutorIds.length > 0 &&
        actualization.isDateModeValid;

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
            setSubmitError(err instanceof Error ? err.message : "Не удалось создать ВНД");
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

        developerName, developerHeadName,
        executorOptions: dictionaries.orgUnitOptions,
        responsibleExecutorIds, setResponsibleExecutorIds, responsibleExecutorHeadNames,

        actualization,
        isValid, isSubmitting, submitError,
        handleSubmit,
        createdVnd, handleSuccessModalDone,
        goBack: () => navigate("/base-vnd"),
    };
}