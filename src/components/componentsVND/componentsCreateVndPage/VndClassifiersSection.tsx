// Секция с классификаторами на странице "Разработка нового ВНД"
import {useTranslation} from "react-i18next";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";

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
                {/*Классификаторы*/}
                {t("createVnd.classifiers.title")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
                <MultiSelectField
                    label={t("createVnd.classifiers.keywords")} // Ключевые слова
                    modalTitle={t("createVnd.classifiers.keywords")} // Ключевые слова
                    options={keywordOptions}
                    selectedKeys={keywordIds}
                    onChange={onKeywordIdsChange}
                    searchPlaceholder={t("createVnd.classifiers.keywordsSearchPlaceholder")} // Поиск ключевых слов…
                    hierarchical
                    boldLabel={false}
                />
                <SingleSelectListField
                    label={t("createVnd.classifiers.secrecyLevel")} // Уровень секретности
                    modalTitle={t("createVnd.classifiers.secrecyLevel")} // Уровень секретности
                    options={secrecyOptions}
                    selectedKey={secrecyLevelId || null}
                    onChange={(key) => onSecrecyLevelIdChange(key ?? "")}
                    searchPlaceholder={t("createVnd.classifiers.secrecyLevelSearchPlaceholder")} // Поиск уровня…
                    boldLabel={false}
                />
                <MultiSelectField
                    label={t("createVnd.classifiers.userGroups")} // Группы доступа
                    modalTitle={t("createVnd.classifiers.userGroups")} // Группы доступа
                    options={userGroupOptions}
                    selectedKeys={userGroupIds}
                    onChange={onUserGroupIdsChange}
                    searchPlaceholder={t("createVnd.classifiers.userGroupsSearchPlaceholder")} // Поиск группы…
                    boldLabel={false}
                />
                <MultiSelectField
                    label={t("createVnd.classifiers.rubric")} // Рубрикатор
                    modalTitle={t("createVnd.classifiers.rubric")} // Рубрикатор
                    options={rubricOptions}
                    selectedKeys={rubricIds}
                    onChange={onRubricIdsChange}
                    searchPlaceholder={t("createVnd.classifiers.rubricSearchPlaceholder")} // Поиск рубрики…
                    hierarchical
                    boldLabel={false}
                />
            </div>
        </div>
    );
}