// Компонента для выбора нескольких СП
import {useTranslation} from "react-i18next";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import type {TreeSelectOption} from "@/components/componentsGeneral/selects/MultiSelects/TreeMultiSelectModal.tsx";
import type {Accent} from "@/constants/accent.ts";

interface OrgUnitMultiSelectFilterProps {
    options: TreeSelectOption[];
    selectedKeys: string[];
    onChange: (keys: string[]) => void;
    accent?: Accent;
}

export function OrgUnitMultiSelectFilter({options, selectedKeys, onChange, accent}: OrgUnitMultiSelectFilterProps) {
    const {t} = useTranslation();
    return (
        <MultiSelectField
            // Структурные подразделения / Фильтр по СП / Поиск СП… / Выбрано СП
            label={t("selectApproverModal.orgUnitFilterLabel")}
            modalTitle={t("selectApproverModal.orgUnitFilterModalTitle")}
            options={options}
            selectedKeys={selectedKeys}
            onChange={onChange}
            hierarchical
            searchPlaceholder={t("selectApproverModal.orgUnitSearchPlaceholder")}
            selectedCountLabel={t("selectApproverModal.orgUnitSelectedCountLabel")}
            boldLabel={false}
            accent={accent}
        />
    );
}