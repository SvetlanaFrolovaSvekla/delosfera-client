// Секция классификаторов на странице при разработке нового ВНД
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {useTranslation} from "react-i18next";

interface DictOption {
    key: string;
    label: string;
    parentId?: string;
}

interface VndClassifiersSectionProps {
    keywordIds: string[];
    onKeywordIdsChange: (ids: string[]) => void;
    keywordOptions: DictOption[];

    rubricIds: string[];
    onRubricIdsChange: (ids: string[]) => void;
    rubricOptions: DictOption[];

    secrecyOptions: DictOption[];
    secrecyLevelId: string;
    onSecrecyLevelIdChange: (id: string) => void;

    userGroupIds: string[];
    onUserGroupIdsChange: (ids: string[]) => void;
    userGroupOptions: DictOption[];
}

export function VndClassifiersSection({
                                          keywordIds, onKeywordIdsChange, keywordOptions,
                                          rubricIds, onRubricIdsChange, rubricOptions,
                                          secrecyOptions, secrecyLevelId, onSecrecyLevelIdChange,
                                          userGroupIds, onUserGroupIdsChange, userGroupOptions,
                                      }: VndClassifiersSectionProps) {
    const {t} = useTranslation();

    return (
        <div className="border border-[#eef2f7] rounded-xl p-3.5 mt-5">
            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                {/* Классификаторы */}
                {t("createVnd.classifiers.title")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
                <MultiSelectField
                    // "Ключевые слова"
                    label={t("createVnd.classifiers.keywords")}
                    modalTitle={t("createVnd.classifiers.keywords")}
                    options={keywordOptions}
                    selectedKeys={keywordIds}
                    onChange={onKeywordIdsChange}
                    // "Поиск ключевых слов…"
                    searchPlaceholder={t("createVnd.classifiers.keywordsSearchPlaceholder")}
                    hierarchical
                    boldLabel={false}
                />
                <MultiSelectField
                    // "Рубрикатор"
                    label={t("createVnd.classifiers.rubric")}
                    modalTitle={t("createVnd.classifiers.rubric")}
                    options={rubricOptions}
                    selectedKeys={rubricIds}
                    onChange={onRubricIdsChange}
                    // "Поиск рубрики…"
                    searchPlaceholder={t("createVnd.classifiers.rubricSearchPlaceholder")}
                    hierarchical
                    boldLabel={false}
                />
                <SingleSelectListField
                    // "Уровень секретности"
                    label={t("createVnd.classifiers.secrecyLevel")}
                    modalTitle={t("createVnd.classifiers.secrecyLevel")}
                    options={secrecyOptions}
                    selectedKey={secrecyLevelId || null}
                    onChange={(key) => onSecrecyLevelIdChange(key ?? "")}
                    // "Поиск уровня…"
                    searchPlaceholder={t("createVnd.classifiers.secrecyLevelSearchPlaceholder")}
                    boldLabel={false}
                />
                <MultiSelectField
                    // "Группы доступа"
                    label={t("createVnd.classifiers.userGroups")}
                    modalTitle={t("createVnd.classifiers.userGroups")}
                    options={userGroupOptions}
                    selectedKeys={userGroupIds}
                    onChange={onUserGroupIdsChange}
                    // "Поиск группы…"
                    searchPlaceholder={t("createVnd.classifiers.userGroupsSearchPlaceholder")}
                    boldLabel={false}
                />
            </div>
        </div>
    );
}