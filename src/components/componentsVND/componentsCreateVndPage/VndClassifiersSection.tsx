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
    return (
        <div className="border border-[#eef2f7] rounded-xl p-3.5 mt-5">
            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                Классификаторы
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 [&>*]:min-w-0">
                <MultiSelectField
                    label="Ключевые слова"
                    modalTitle="Ключевые слова"
                    options={keywordOptions}
                    selectedKeys={keywordIds}
                    onChange={onKeywordIdsChange}
                    searchPlaceholder="Поиск ключевых слов…"
                    hierarchical
                    boldLabel={false}
                />
                <MultiSelectField
                    label="Рубрикатор"
                    modalTitle="Рубрикатор"
                    options={rubricOptions}
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
                    options={userGroupOptions}
                    selectedKeys={userGroupIds}
                    onChange={onUserGroupIdsChange}
                    searchPlaceholder="Поиск группы…"
                    boldLabel={false}
                />
            </div>
        </div>
    );
}