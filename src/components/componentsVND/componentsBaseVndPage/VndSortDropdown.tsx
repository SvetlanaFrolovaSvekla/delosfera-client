// Выпадающий список "Сортировка" на странице "Реестр ВНД"
import {useTranslation} from "react-i18next";
import {VND_SORT_OPTIONS, type VndSortKey} from "@/utils/vndProcess/vndSort.ts";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";

interface VndSortDropdownProps {
    value: VndSortKey;
    onChange: (value: VndSortKey) => void;
}

export function VndSortDropdown({value, onChange}: VndSortDropdownProps) {
    const {t} = useTranslation();
    return (
        <SelectDropdown
            label={t("registry.sort.label")} // Сортировка:
            options={VND_SORT_OPTIONS.map((o) => ({value: o.value, label: t(o.labelKey)}))}
            value={value}
            onChange={(v) => onChange(v as VndSortKey)}
            minWidth="250px"
            className="font-semibold text-gray-500"
            valueClassName="font-semibold"
        />
    );
}
