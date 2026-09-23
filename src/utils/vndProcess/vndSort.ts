// Сортировка строк реестра ВНД (страница "Реестр ВНД", BaseVndPage).
// Сортируем на клиенте: SearchAsync отдаёт весь набор строк без пагинации, и поиск по
// строке (useVndFilteredRows) тоже идёт на клиенте — так что отдельный запрос к серверу
// при смене сортировки не нужен.
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";

export type VndSortKey = "codeAsc" | "codeDesc" | "updatedDesc" | "updatedAsc";

// По умолчанию — по коду по возрастанию
export const DEFAULT_VND_SORT: VndSortKey = "codeAsc";

export const VND_SORT_OPTIONS: { value: VndSortKey; labelKey: string }[] = [
    {value: "codeAsc", labelKey: "registry.sort.codeAsc"},
    {value: "codeDesc", labelKey: "registry.sort.codeDesc"},
    {value: "updatedDesc", labelKey: "registry.sort.updatedDesc"},
    {value: "updatedAsc", labelKey: "registry.sort.updatedAsc"},
];

// "Естественное" сравнение кодов: "ВНД-2" < "ВНД-10" (а не наоборот, как при обычном
// строковом сравнении), без учёта регистра.
const codeCollator = new Intl.Collator("ru", {numeric: true, sensitivity: "base"});

function compareCode(a: VndResponse, b: VndResponse): number {
    const ac = (a.code ?? "").trim();
    const bc = (b.code ?? "").trim();
    // Документы без кода (напр. черновики) — всегда в конце, в любом направлении
    if (!ac && !bc) return 0;
    if (!ac) return 1;
    if (!bc) return -1;
    return codeCollator.compare(ac, bc);
}

/**
 * Дата последнего изменения документа — самая поздняя из "событийных" дат: изменение
 * реквизитов, изменение редакции, актуализация, отмена, архивирование, принятие, создание.
 * Все даты сводим к "YYYY-MM-DD" (createdAt приходит как ISO datetime), чтобы сравнивать
 * строками. updatedAt в основной ключ намеренно не берём: он может меняться и от
 * технических операций, не заметных пользователю, — он используется только для
 * разрешения "ничьих" внутри одного дня (см. compareUpdated).
 */
export function getVndLastChangeDate(r: VndResponse): string {
    const dates = [
        r.requisitesChangedDate,
        r.revisionChangedDate,
        r.lastActualizationDate,
        r.cancelDate,
        r.archivedDate,
        r.adoptionDate,
        r.createdAt,
    ];
    let max = "";
    for (const d of dates) {
        if (!d) continue;
        const day = d.slice(0, 10);
        if (day > max) max = day;
    }
    return max;
}

// По возрастанию (от старых к новым); направление переворачивается в sortVndRows
function compareUpdated(a: VndResponse, b: VndResponse): number {
    const ad = getVndLastChangeDate(a);
    const bd = getVndLastChangeDate(b);
    if (ad !== bd) return ad < bd ? -1 : 1;
    const au = a.updatedAt ?? "";
    const bu = b.updatedAt ?? "";
    if (au !== bu) return au < bu ? -1 : 1;
    return 0;
}

export function sortVndRows(rows: VndResponse[], sort: VndSortKey): VndResponse[] {
    const sorted = [...rows];
    switch (sort) {
        case "codeAsc":
            sorted.sort((a, b) => compareCode(a, b) || a.id - b.id);
            break;
        case "codeDesc":
            sorted.sort((a, b) => {
                // Пустые коды остаются в конце и при сортировке по убыванию
                const ae = !(a.code ?? "").trim(), be = !(b.code ?? "").trim();
                if (ae !== be) return ae ? 1 : -1;
                return -compareCode(a, b) || b.id - a.id;
            });
            break;
        case "updatedDesc":
            // При равной дате — по коду по возрастанию, чтобы порядок был стабильным
            sorted.sort((a, b) => -compareUpdated(a, b) || compareCode(a, b));
            break;
        case "updatedAsc":
            sorted.sort((a, b) => compareUpdated(a, b) || compareCode(a, b));
            break;
    }
    return sorted;
}
