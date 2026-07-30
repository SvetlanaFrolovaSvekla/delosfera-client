import {useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {vndService} from "@/service/vndService/vndService.ts";
import type {CreateVndRequest, VndResponse} from "@/service/vndService/vndServiceType.ts";
import {userService} from "@/service/userService/userService.ts";
import type {OrganizationUnitResponse, UserResponse} from "@/service/userService/userServiceType.ts";
import {
    organizationUnitService
} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {TYPE_VND, ORGANS_APPROVAL, SECURITY_LEVELS} from "@/service/mockData/DictionaryData.tsx";
import {useVndActualization} from "@/hooks/vndHooks/useVndActualization.ts";

export function useCreateVndForm() {
    const navigate = useNavigate();
    const actualization = useVndActualization();

    const typeOptions = useMemo(() => TYPE_VND.map((t) => ({value: t.id, label: t.name})), []);
    const organOptions = useMemo(
        () => ORGANS_APPROVAL.map((o) => ({key: o.id, label: o.name, parentId: o.parentId})),
        []
    );
    const secrecyOptions = useMemo(() => SECURITY_LEVELS.map((s) => ({key: s.id, label: s.name})), []);

    const [typeId, setTypeId] = useState("");
    const [organId, setOrganId] = useState<string | null>(null);
    const [titleRu, setTitleRu] = useState("");
    const [titleKy, setTitleKy] = useState("");
    const [titleEn, setTitleEn] = useState("");

    const [keywordIds, setKeywordIds] = useState<string[]>([]);
    const [rubricIds, setRubricIds] = useState<string[]>([]);
    const [secrecyLevelId, setSecrecyLevelId] = useState("");
    const [userGroupIds, setUserGroupIds] = useState<string[]>([]);

    // --- Разработчик (СП) — теперь всегда = подразделение текущего пользователя, не редактируется ---
    const [orgUnits, setOrgUnits] = useState<OrganizationUnitResponse[]>([]);
    const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
    const [developerId, setDeveloperId] = useState("");

    // Ответственные исполнители — редактируются пользователем
    const [responsibleExecutorIds, setResponsibleExecutorIdsState] = useState<string[]>([]);
    const executorsTouched = useRef(false);

    // Созданная ВНД
    const [createdVnd, setCreatedVnd] = useState<VndResponse | null>(null);

    const setResponsibleExecutorIds = (values: string[]) => {
        executorsTouched.current = true;
        setResponsibleExecutorIdsState(values);
    };

    useEffect(() => {
        organizationUnitService.getAll().then(setOrgUnits).catch(() => {});
        userService.getMe().then(setCurrentUser).catch(() => {});
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
        () => orgUnits.find((u) => String(u.id) === developerId)?.name ?? currentUser?.orgUnit?.name ?? "",
        [orgUnits, developerId, currentUser]
    );

    const developerHeadName = useMemo(
        () => orgUnits.find((u) => String(u.id) === developerId)?.headUserName ?? null,
        [orgUnits, developerId]
    );

    // Для MultiSelectField (ответственные исполнители) — весь список СП в формате {key, label}
    const executorOptions = useMemo(
        () => orgUnits.map((u) => ({key: String(u.id), label: u.name})),
        [orgUnits]
    );

    const responsibleExecutorHeadNames = useMemo(
        () => responsibleExecutorIds
            .map((id) => orgUnits.find((u) => String(u.id) === id)?.headUserName)
            .filter((name): name is string => Boolean(name)),
        [orgUnits, responsibleExecutorIds]
    );

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const isValid =
        typeId !== "" &&
        organId !== null &&
        titleRu.trim() !== "" &&
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
            navigate(`/basevnd/${createdVnd.id}`, {state: {vnd: createdVnd}});
        }
    };

    return {
        typeOptions, organOptions, secrecyOptions,
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
        executorOptions, responsibleExecutorIds, setResponsibleExecutorIds, responsibleExecutorHeadNames,

        actualization,
        isValid, isSubmitting, submitError,
        handleSubmit,
        createdVnd, handleSuccessModalDone,
        goBack: () => navigate("/basevnd"),
    };
}