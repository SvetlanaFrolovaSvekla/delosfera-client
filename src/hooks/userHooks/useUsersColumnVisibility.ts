import {useState} from "react";
import {getToggleableUserColumns, USER_COLUMNS} from "@/constants/columnsFilters/usersColumns.ts";

// Колонки, видимые по умолчанию из числа переключаемых
const DEFAULT_VISIBLE: string[] = ["orgUnit", "roles", "source"];

function buildDefaultVisibility(): Record<string, boolean> {
    const toggleable = getToggleableUserColumns();
    return Object.fromEntries(toggleable.map((c) => [c.key, DEFAULT_VISIBLE.includes(c.key)]));
}

export function useUsersColumnVisibility() {
    const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(buildDefaultVisibility());

    const toggleColumn = (key: string) =>
        setVisibleCols((prev) => ({...prev, [key]: !(prev[key] === true)}));

    const selectAllColumns = () =>
        setVisibleCols(Object.fromEntries(getToggleableUserColumns().map((c) => [c.key, true])));

    const deselectAllColumns = () =>
        setVisibleCols(Object.fromEntries(getToggleableUserColumns().map((c) => [c.key, false])));

    // Применить готовый набор — представление журнала. Ключи, которых в списке
    // нет, молча отбрасываются: набор сохранён однажды, а состав колонок может
    // с тех пор измениться.
    const applyColumns = (keys: string[]) =>
        setVisibleCols(Object.fromEntries(
            getToggleableUserColumns().map((c) => [c.key, keys.includes(c.key)]),
        ));

    const columns = USER_COLUMNS.filter((c) => c.fixed || visibleCols[c.key] === true);
    const gridTemplate = columns.map((c) => c.width).join(" ");
    const toggleableColumns = getToggleableUserColumns();

    // Что показано сейчас — в порядке колонок журнала, а не в порядке отметок.
    // Порядок значим: он и есть порядок столбцов при следующем применении.
    const currentColumns = toggleableColumns
        .filter((c) => visibleCols[c.key] === true)
        .map((c) => c.key);

    return {
        visibleCols, toggleColumn, selectAllColumns, deselectAllColumns,
        columns, gridTemplate, toggleableColumns,
        currentColumns, applyColumns,
        defaultColumns: DEFAULT_VISIBLE,
    };
}