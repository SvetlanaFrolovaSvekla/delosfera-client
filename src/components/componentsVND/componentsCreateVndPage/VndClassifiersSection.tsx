import {KEYWORDS, RUBRICS, USER_GROUPS} from "@/service/mockData/DictionaryData.tsx";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";

interface VndClassifiersSectionProps {
    keywordIds: string[];
    onKeywordIdsChange: (ids: string[]) => void;
    rubricIds: string[];
    onRubricIdsChange: (ids: string[]) => void;
    secrecyOptions: { key: string; label: string }[];
    secrecyLevelId: string;
    onSecrecyLevelIdChange: (id: string) => void;
    userGroupIds: string[];
    onUserGroupIdsChange: (ids: string[]) => void;
}

export function VndClassifiersSection({
                                          keywordIds, onKeywordIdsChange,
                                          rubricIds, onRubricIdsChange,
                                          secrecyOptions, secrecyLevelId, onSecrecyLevelIdChange,
                                          userGroupIds, onUserGroupIdsChange,
                                      }: VndClassifiersSectionProps) {
    return (
        <div className="border border-[#eef2f7] rounded-xl p-3.5 mt-5">
            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                Классификаторы
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MultiSelectField
                    label="Ключевые слова"
                    modalTitle="Ключевые слова"
                    options={KEYWORDS.map((k) => ({key: k.id, label: k.name, parentId: k.parentId}))}
                    selectedKeys={keywordIds}
                    onChange={onKeywordIdsChange}
                    searchPlaceholder="Поиск ключевых слов…"
                    hierarchical
                    boldLabel={false}
                />
                <MultiSelectField
                    label="Рубрикатор"
                    modalTitle="Рубрикатор"
                    options={RUBRICS.map((r) => ({key: r.id, label: r.name, parentId: r.parentId}))}
                    selectedKeys={rubricIds}
                    onChange={onRubricIdsChange}
                    searchPlaceholder="Поиск рубрики…"
                    hierarchical
                    boldLabel={false}
                />
                <SingleSelectListField
                    label="Уровень секретности"
                    modalTitle="Уровень секретности"
                    options={secrecyOptions}
                    selectedKey={secrecyLevelId || null}
                    onChange={(key) => onSecrecyLevelIdChange(key ?? "")}
                    searchPlaceholder="Поиск уровня…"
                    boldLabel={false}
                />
                <MultiSelectField
                    label="Группы доступа"
                    modalTitle="Группы доступа"
                    options={USER_GROUPS.map((g) => ({key: g.id, label: g.name}))}
                    selectedKeys={userGroupIds}
                    onChange={onUserGroupIdsChange}
                    searchPlaceholder="Поиск группы…"
                    boldLabel={false}
                />
            </div>
        </div>
    );
}