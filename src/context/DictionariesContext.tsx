import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from "react";
import {typeVndService} from "@/service/dictionariesService/typeVndService/typeVndService.ts";
import {approvalBodyService} from "@/service/dictionariesService/approvalBodyService/approvalBodyService.ts";
import {
    organizationUnitService
} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {keywordService} from "@/service/dictionariesService/keywordService/keywordService.ts";
import {rubricService} from "@/service/dictionariesService/rubricService/rubricService.ts";
import {securityLevelService} from "@/service/dictionariesService/securityLevelService/securityLevelService.ts";
import {userGroupService} from "@/service/dictionariesService/userGroupService/userGroupService.ts";
import {positionService} from "@/service/dictionariesService/positionService/positionService.ts";
import type {TypeVndResponse} from "@/service/dictionariesService/typeVndService/typeVndServiceType.ts";
import type {ApprovalBodyResponse} from "@/service/dictionariesService/approvalBodyService/approvalBodyServiceType.ts";
import type {
    OrganizationUnitResponse
} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";
import type {KeywordResponse} from "@/service/dictionariesService/keywordService/keywordServiceType.ts";
import type {RubricResponse} from "@/service/dictionariesService/rubricService/rubricServiceType.ts";
import type {
    SecurityLevelResponse
} from "@/service/dictionariesService/securityLevelService/securityLevelServiceType.ts";
import type {UserGroupResponse} from "@/service/dictionariesService/userGroupService/userGroupServiceType.ts";
import type {PositionResponse} from "@/service/dictionariesService/positionService/positionServiceType.ts";

interface DictOption {
    key: string;
    label: string;
    parentId?: string;
}

interface DictionariesContextValue {
    types: TypeVndResponse[];
    organs: ApprovalBodyResponse[];
    orgUnits: OrganizationUnitResponse[];
    keywords: KeywordResponse[];
    rubrics: RubricResponse[];
    secrecyLevels: SecurityLevelResponse[];
    userGroups: UserGroupResponse[];
    positions: PositionResponse[];

    typeOptions: DictOption[];
    organOptions: DictOption[];
    orgUnitOptions: DictOption[];
    keywordOptions: DictOption[];
    rubricOptions: DictOption[];
    secrecyOptions: DictOption[];
    userGroupOptions: DictOption[];
    positionOptions: DictOption[];

    loading: boolean;
    error: string | null;
    refetch: () => void;
}

const DictionariesContext = createContext<DictionariesContextValue | null>(null);

const toOptions = <T extends { id: number; name: string; parentId?: number | null }>(
    items: T[]
): DictOption[] =>
    items.map((x) => ({
        key: String(x.id),
        label: x.name,
        parentId: x.parentId != null ? String(x.parentId) : undefined,
    }));

export function DictionariesProvider({children}: { children: ReactNode }) {
    const [types, setTypes] = useState<TypeVndResponse[]>([]);
    const [organs, setOrgans] = useState<ApprovalBodyResponse[]>([]);
    const [orgUnits, setOrgUnits] = useState<OrganizationUnitResponse[]>([]);
    const [keywords, setKeywords] = useState<KeywordResponse[]>([]);
    const [rubrics, setRubrics] = useState<RubricResponse[]>([]);
    const [secrecyLevels, setSecrecyLevels] = useState<SecurityLevelResponse[]>([]);
    const [userGroups, setUserGroups] = useState<UserGroupResponse[]>([]);
    const [positions, setPositions] = useState<PositionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const refetch = () => setReloadKey((k) => k + 1);

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        setError(null);

        Promise.all([
            typeVndService.getAll(),
            approvalBodyService.getAll(),
            organizationUnitService.getAll(),
            keywordService.getAll(),
            rubricService.getAll(),
            securityLevelService.getAll(),
            userGroupService.getAll(),
            positionService.getAll(),
        ])
            .then(([typesRes, organsRes, orgUnitsRes, keywordsRes, rubricsRes, secrecyRes, userGroupsRes, positionsRes]) => {
                if (cancelled) return;
                setTypes(typesRes);
                setOrgans(organsRes);
                setOrgUnits(orgUnitsRes);
                setKeywords(keywordsRes);
                setRubrics(rubricsRes);
                setSecrecyLevels(secrecyRes);
                setUserGroups(userGroupsRes);
                setPositions(positionsRes);
            })
            .catch(() => {
                if (!cancelled) setError("Не удалось загрузить справочники");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const value = useMemo<DictionariesContextValue>(() => ({
        types, organs, orgUnits, keywords, rubrics, secrecyLevels, userGroups, positions,
        typeOptions: toOptions(types),
        organOptions: toOptions(organs),
        orgUnitOptions: toOptions(orgUnits),
        keywordOptions: toOptions(keywords),
        rubricOptions: toOptions(rubrics),
        secrecyOptions: toOptions(secrecyLevels),
        userGroupOptions: toOptions(userGroups),
        positionOptions: positions.map((x) => ({key: String(x.id), label: x.titleRu})),
        loading, error, refetch,
    }), [types, organs, orgUnits, keywords, rubrics, secrecyLevels, userGroups, positions, loading, error]);

    return (
        <DictionariesContext.Provider value={value}>
            {children}
        </DictionariesContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDictionaries(): DictionariesContextValue {
    const ctx = useContext(DictionariesContext);
    if (!ctx) throw new Error("useDictionaries должен использоваться внутри DictionariesProvider");
    return ctx;
}