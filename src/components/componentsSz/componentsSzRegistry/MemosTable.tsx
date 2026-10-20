import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import type {SzListItem} from "@/service/szService/szService.ts";
import {STATUS_TONE} from "@/constants/szConstatns/szStatusTone.ts";
import {HighlightSubstrings, splitSearchTerms} from "@/utils/highlightText.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {colors} from "@/design/tokens.ts";
import {DueCell} from "./DueCell.tsx";
import {formatDate} from "./registryModel.ts";
import {RegistryStateRow, RegistryTable, type RegistryColumn} from "./RegistryTable.tsx";
import {SzFavoriteButton} from "@/components/componentsSz/componentsSzRegistry/SzFavoriteButton.tsx";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";

interface Props {
    items: SzListItem[];
    loading: boolean;
    /** Запрос, по которому получены строки: подсвечиваем его, а не то что набрано прямо сейчас. */
    appliedQuery: string;
    kindName: (id: number, fallback: string) => string;
    selected: ReadonlySet<number>;
    toggleRow: (id: number) => void;
    toggleAll: () => void;
    allOnPageSelected: boolean;
    /** Звёздочку «Избранное» в строке переключили — отметка уже сохранена на сервере. */
    onFavoriteChange?: (id: number, isFavorite: boolean) => void;
}

/** Основная таблица реестра служебных записок с выбором строк. */
export function MemosTable({
                               items, loading, appliedQuery, kindName,
                               selected, toggleRow, toggleAll, allOnPageSelected, onFavoriteChange,
                           }: Props) {
    const {t} = useTranslation();
    // Слова запроса: подсвечиваем каждое, как ищет сервер (все слова, в любом месте и порядке)
    const terms = splitSearchTerms(appliedQuery);
    const columns: RegistryColumn[] = [
        {
            className: "px-3 py-2.5 text-left w-[40px]",
            content: <PlainCheckbox tone="brand" checked={allOnPageSelected} onChange={toggleAll}
                                    ariaLabel={t("szRegistry.selectAll")}/>,
        },
        {className: "px-1 py-2.5 text-left w-[36px]", content: <span className="sr-only">{t("szRegistry.cols.favorite")}</span>},
        {className: "px-4 py-2.5 text-left w-[140px]", content: t("szRegistry.cols.number")},
        {className: "px-4 py-2.5 text-left w-[130px]", content: t("szRegistry.cols.registeredOn")},
        {className: "px-4 py-2.5 text-left", content: t("szRegistry.cols.subject")},
        {className: "px-4 py-2.5 text-left w-[130px]", content: t("szRegistry.cols.kind")},
        {className: "px-4 py-2.5 text-left w-[170px]", content: t("szRegistry.cols.author")},
        {className: "px-4 py-2.5 text-left w-[150px]", content: t("szRegistry.cols.dueDate")},
        {className: "px-4 py-2.5 text-left w-[180px]", content: t("szRegistry.cols.status")},
    ];

    return (
        <RegistryTable columns={columns}>
            {loading ? (
                <RegistryStateRow colSpan={9}>{t("general.loading")}</RegistryStateRow>
            ) : items.length === 0 ? (
                <RegistryStateRow colSpan={9}>{t("szRegistry.memosEmpty")}</RegistryStateRow>
            ) : items.map((i) => {
                const tone = STATUS_TONE[i.statusCode] ?? colors.status.draft;
                return (
                    <tr key={i.id} className="border-t border-[#eef2f7] hover:bg-[#fafbfd]">
                        <td className="px-3 py-2.5">
                            <PlainCheckbox
                                tone="brand"
                                checked={selected.has(i.id)}
                                onChange={() => toggleRow(i.id)}
                                ariaLabel={t("szRegistry.selectRow", {name: i.regNumber ?? i.title})}
                            />
                        </td>
                        <td className="px-1 py-1.5">
                            <SzFavoriteButton
                                szId={i.id}
                                isFavorite={!!i.isFavorite}
                                onChange={(fav) => onFavoriteChange?.(i.id, fav)}
                            />
                        </td>
                        <td className="px-4 py-2.5">
                            <Link to={`/sz/${i.id}`}
                                  className="font-mono text-[12.5px] text-[#2f68f5] no-underline hover:underline">
                                {i.regNumber
                                    ? <HighlightSubstrings text={i.regNumber} terms={terms}/>
                                    : t("szRegistry.noNumber")}
                            </Link>
                        </td>
                        <td className="px-4 py-2.5 text-[#55617a]">{i.registeredOn ? formatDate(i.registeredOn) : "—"}</td>
                        <td className="px-4 py-2.5">
                            <Link to={`/sz/${i.id}`} className="text-[#1c2740] no-underline hover:underline">
                                <HighlightSubstrings text={i.title} terms={terms}/>
                            </Link>
                            {i.isPaperCarrier && (
                                <span className="ml-2 text-[10.5px] font-semibold uppercase tracking-[.03em] text-[#b3730a]">
                                    {t("szRegistry.paper")}
                                </span>
                            )}
                        </td>
                        <td className="px-4 py-2.5 text-[#55617a]">{kindName(i.kindId, i.kind)}</td>
                        {/* Автор — с аватаркой-инициалами, как в реестре заявок на замещение */}
                        <td className="px-4 py-2.5">
                            {i.author ? (
                                <span className="flex min-w-0 items-center gap-2">
                                    <Avatar name={i.author} size={24}/>
                                    <span className="truncate text-[#55617a]">
                                        <HighlightSubstrings text={i.author} terms={terms}/>
                                    </span>
                                </span>
                            ) : <span className="text-[#a3adbd]">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                            <DueCell dueDate={i.dueDate} isOverdue={i.isOverdue} daysLeft={i.daysLeft}/>
                        </td>
                        <td className="px-4 py-2.5">
                            <span className="inline-flex rounded-full px-[9px] py-0.5 text-[11px] font-semibold"
                                  style={{color: tone.fg, background: tone.bg}}>
                                {t(`szRegistry.status.${i.statusCode}`)}
                            </span>
                        </td>
                    </tr>
                );
            })}
        </RegistryTable>
    );
}
