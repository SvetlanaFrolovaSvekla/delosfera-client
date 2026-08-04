import {useEffect, useState} from "react";
import {typeVndService} from "@/service/dictionariesService/typeVndService/typeVndService.ts";
import {approvalBodyService} from "@/service/dictionariesService/approvalBodyService/approvalBodyService.ts";
import {
    organizationUnitService
} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import {keywordService} from "@/service/dictionariesService/keywordService/keywordService.ts";
import {rubricService} from "@/service/dictionariesService/rubricService/rubricService.ts";
import {securityLevelService} from "@/service/dictionariesService/securityLevelService/securityLevelService.ts";
import {userGroupService} from "@/service/dictionariesService/userGroupService/userGroupService.ts";
import {userService} from "@/service/userService/userService.ts";

interface DictOption {
    key: string;
    label: string;
    parentId?: string;
}

interface VndDictionaries {
    typeOptions: DictOption[];
    organOptions: DictOption[];
    orgUnitOptions: DictOption[]; // используется и как developerOptions, и как executorOptions
    curatorOptions: DictOption[]; // пользователи
    keywordOptions: DictOption[];
    rubricOptions: DictOption[];
    secrecyOptions: DictOption[];
    userGroupOptions: DictOption[];
    loading: boolean;
    error: string | null;
}

const EMPTY: DictOption[] = [];

/**
 * Загружает все справочники, нужные для форм ВНД. Одна загрузка на монтирование -
 * компоненты просто читают готовые options.
 */
export function useVndDictionaries(): VndDictionaries {
    const [typeOptions, setTypeOptions] = useState<DictOption[]>(EMPTY);
    const [organOptions, setOrganOptions] = useState<DictOption[]>(EMPTY);
    const [orgUnitOptions, setOrgUnitOptions] = useState<DictOption[]>(EMPTY);
    const [curatorOptions, setCuratorOptions] = useState<DictOption[]>(EMPTY);
    const [keywordOptions, setKeywordOptions] = useState<DictOption[]>(EMPTY);
    const [rubricOptions, setRubricOptions] = useState<DictOption[]>(EMPTY);
    const [secrecyOptions, setSecrecyOptions] = useState<DictOption[]>(EMPTY);
    const [userGroupOptions, setUserGroupOptions] = useState<DictOption[]>(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            typeVndService.getAll(),
            approvalBodyService.getAll(),
            organizationUnitService.getAll(),
            userService.getAll(),
            keywordService.getAll(),
            rubricService.getAll(),
            securityLevelService.getAll(),
            userGroupService.getAll(),
        ])
            .then(([types, organs, orgUnits, users, keywords, rubrics, secrecy, userGroups]) => {
                setTypeOptions(types.map((x) => ({key: String(x.id), label: x.name})));
                setOrganOptions(
                    organs.map((x) => ({
                        key: String(x.id),
                        label: x.name,
                        parentId: x.parentId != null ? String(x.parentId) : undefined,
                    }))
                );
                setOrgUnitOptions(orgUnits.map((x) => ({key: String(x.id), label: x.name})));
                setCuratorOptions(users.map((x) => ({key: String(x.id), label: x.fullName})));
                setKeywordOptions(
                    keywords.map((x) => ({
                        key: String(x.id),
                        label: x.name,
                        parentId: x.parentId != null ? String(x.parentId) : undefined,
                    }))
                );
                setRubricOptions(
                    rubrics.map((x) => ({
                        key: String(x.id),
                        label: x.name,
                        parentId: x.parentId != null ? String(x.parentId) : undefined,
                    }))
                );
                setSecrecyOptions(secrecy.map((x) => ({key: String(x.id), label: x.name})));
                setUserGroupOptions(userGroups.map((x) => ({key: String(x.id), label: x.name})));
            })
            .catch(() => setError("Не удалось загрузить справочники"))
            .finally(() => setLoading(false));
    }, []);

    return {
        typeOptions, organOptions, orgUnitOptions, curatorOptions,
        keywordOptions, rubricOptions, secrecyOptions, userGroupOptions,
        loading, error,
    };
}