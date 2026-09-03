import {useEffect, useState} from "react";
import type {VndScope} from "@/constants/vndTabs.ts";
import {getColumnsForScope, getToggleableColumns} from "@/constants/columnsFilters/vndColumns.ts";

const DEFAULT_VISIBLE_ALL_ACTIVE: string[] = ["act", "status", "linkedToMe"];
const DEFAULT_VISIBLE_ARCH: string[] = ["status", "linkedToMe"];
const DEFAULT_VISIBLE_DRAFT: string[] = ["status", "linkedToMe"];

function defaultVisibleForScope(scope: VndScope): string[] {
    return scope === "arch" ? DEFAULT_VISIBLE_ARCH :
        scope === "draft" ? DEFAULT_VISIBLE_DRAFT :
            DEFAULT_VISIBLE_ALL_ACTIVE;
}

function buildDefaultVisibility(scope: VndScope, canViewExtended: boolean, linkedToMeOnly: boolean): Record<string, boolean> {
    const toggleable = getToggleableColumns(scope, canViewExtended, linkedToMeOnly);
    const defaultVisible = defaultVisibleForScope(scope);

    return Object.fromEntries(toggleable.map((c) => [c.key, defaultVisible.includes(c.key)]));
}

// canViewExtended — право ViewVndRegistryExtended: без него колонки "Статус последней
// редакции" и "Актуализация" (и их фильтры) недоступны и не попадают ни в список колонок,
// ни в переключатель "Колонки".
// linkedToMeOnly — включён ли чекбокс "Только связанные со мной": колонка "Связь со мной"
// появляется в списке/переключателе только пока он включён, и автоматически становится
// видимой в момент включения (см. эффект ниже — он же покрывает переключение вкладок).
export function useVndColumnVisibility(scope: VndScope, canViewExtended: boolean = true, linkedToMeOnly: boolean = false) {
    const [visibleColsByScope, setVisibleColsByScope] = useState<Record<VndScope, Record<string, boolean>>>({
        all: buildDefaultVisibility("all", canViewExtended, linkedToMeOnly),
        active: buildDefaultVisibility("active", canViewExtended, linkedToMeOnly),
        notYetActive: buildDefaultVisibility("notYetActive", canViewExtended, linkedToMeOnly),
        draft: buildDefaultVisibility("draft", canViewExtended, linkedToMeOnly),
        arch: buildDefaultVisibility("arch", canViewExtended, linkedToMeOnly),
    });

    // Когда набор переключаемых колонок меняется (право выдано/забрано, чекбокс "Только
    // связанные со мной" включён/выключен, смена вкладки) — новые колонки, ещё не имеющие
    // сохранённого состояния для текущего scope, получают видимость по умолчанию. Так
    // "Связь со мной" сразу появляется отмеченной в момент включения чекбокса, а не только
    // при следующем ремонте компонента.
    useEffect(() => {
        const toggleable = getToggleableColumns(scope, canViewExtended, linkedToMeOnly);
        const defaultVisible = defaultVisibleForScope(scope);

        setVisibleColsByScope((prev) => {
            const current = prev[scope];
            const missing = toggleable.filter((c) => !(c.key in current));
            if (missing.length === 0) return prev;

            return {
                ...prev,
                [scope]: {
                    ...current,
                    ...Object.fromEntries(missing.map((c) => [c.key, defaultVisible.includes(c.key)])),
                },
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scope, canViewExtended, linkedToMeOnly]);

    const visibleCols = visibleColsByScope[scope];

    const toggleColumn = (key: string) =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: {...prev[scope], [key]: !(prev[scope][key] === true)},
        }));

    const selectAllColumns = () =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: Object.fromEntries(getToggleableColumns(scope, canViewExtended, linkedToMeOnly).map((c) => [c.key, true])),
        }));

    const deselectAllColumns = () =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: Object.fromEntries(getToggleableColumns(scope, canViewExtended, linkedToMeOnly).map((c) => [c.key, false])),
        }));

    // Применить готовый набор — представление журнала. Ключи, которых в этой
    // вкладке нет (право забрано, чекбокс выключен), молча отбрасываются: набор
    // сохранён однажды, а состав колонок зависит от прав и вкладки.
    const applyColumns = (keys: string[]) =>
        setVisibleColsByScope((prev) => ({
            ...prev,
            [scope]: Object.fromEntries(
                getToggleableColumns(scope, canViewExtended, linkedToMeOnly)
                    .map((c) => [c.key, keys.includes(c.key)]),
            ),
        }));

    const allColumns = getColumnsForScope(scope, canViewExtended, linkedToMeOnly);
    const columns = allColumns.filter((c) => c.fixed || visibleCols[c.key] === true);
    const gridTemplate = columns.map((c) => c.width).join(" ");
    const toggleableColumns = getToggleableColumns(scope, canViewExtended, linkedToMeOnly);

    // Что показано сейчас — в порядке колонок журнала, а не в порядке отметок.
    // Порядок значим: он и есть порядок столбцов при следующем применении.
    const currentColumns = toggleableColumns
        .filter((c) => visibleCols[c.key] === true)
        .map((c) => c.key as string);

    return {
        visibleCols, toggleColumn, selectAllColumns, deselectAllColumns,
        columns, gridTemplate, toggleableColumns,
        currentColumns, applyColumns,
        defaultColumns: defaultVisibleForScope(scope),
    };
}
