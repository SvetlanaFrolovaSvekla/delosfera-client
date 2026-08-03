import {
    type OrganizationUnit,
    type Keyword,
    KEYWORDS,
    ORG_UNITS,
    type SecurityLevel,
    SECURITY_LEVELS,
    USER_GROUPS,
    type UserGroup,
    type Rubric,
    RUBRICS,
} from "@/service/mockData/DictionaryData.tsx";

const orgUnitMap = new Map<string, OrganizationUnit>(ORG_UNITS.map((o) => [o.id, o]));
export const orgUnitName = (id: number) => orgUnitMap.get(String(id))?.name ?? "—";

const keywordMap = new Map<string, Keyword>(KEYWORDS.map((k) => [k.id, k]));
export const keywordNames = (ids: number[]) =>
    ids.map((id) => keywordMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";

const securityLevelMap = new Map<string, SecurityLevel>(SECURITY_LEVELS.map((s) => [s.id, s]));
export const secrecyLevelName = (id?: number) => (id != null ? securityLevelMap.get(String(id))?.name ?? "—" : "—");

const userGroupMap = new Map<string, UserGroup>(USER_GROUPS.map((g) => [g.id, g]));
export const userGroupNames = (ids: number[]) =>
    ids.map((id) => userGroupMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";

export const responsibleExecutorNames = (ids: number[]) =>
    ids.map((id) => orgUnitName(id)).filter((n) => n !== "—").join(", ") || "—";

const rubricMap = new Map<string, Rubric>(RUBRICS.map((r) => [r.id, r]));
export const rubricNames = (ids: number[]) =>
    ids.map((id) => rubricMap.get(String(id))?.name).filter(Boolean).join(", ") || "—";