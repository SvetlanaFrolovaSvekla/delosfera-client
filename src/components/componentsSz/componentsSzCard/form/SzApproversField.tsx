// Состав согласующих записки
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {ArrowDown, ArrowUp, ChevronRight, Users, X} from "lucide-react";
import {SzUserMultiPickerModal} from "@/components/componentsSz/componentsSzCard/controls/SzUserMultiPickerModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {Avatar} from "@/components/componentsGeneral/Avatar.tsx";

export interface ApproverOption {
    id: number;
    fullName: string;

    /** Должность и подразделение — по ним отличают однофамильцев. */
    position?: string | null;
    orgUnit?: string | null;
    /** СП — по нему фильтрует модалка выбора. */
    orgUnitId?: number | null;

    /** Председатель Правления — идёт первым в подборе. */
    isChairman?: boolean;
    /** Член Правления — идёт следом за председателем. */
    isBoardMember?: boolean;

    /** Руководит подразделением — идёт вторым. */
    isUnitHead?: boolean;
}

interface Props {
    /** Выбранные согласующие: порядок в массиве и есть очерёдность маршрута. */
    value: number[];
    onChange: (userIds: number[]) => void;
    users: ApproverOption[];
    parallel: boolean;
    onParallelChange: (parallel: boolean) => void;
    editable: boolean;
    /** Согласующие, уже вынесшие решение на идущем маршруте: их нельзя убрать или переставить. */
    lockedIds?: number[];
    /** Правка идёт по запущенному маршруту (корректировка) — показываем, как она применится. */
    onRoute?: boolean;
}

/** Кнопка-иконка в строке согласующего: сдвинуть, убрать. */
const iconButtonClass =
    "grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] border-none bg-transparent text-[#8b97ab] transition-colors disabled:cursor-default disabled:opacity-30";

/**
 * Состав согласующих записки.
 *
 * Выбор множественный: согласующих обычно назначают пачкой — руководитель, юрист,
 * бухгалтер, — и добавлять их по одному из списка в полтысячи человек значит
 * пять раз пройти один и тот же путь. Поэтому модалка с поиском, фильтром по СП
 * и отметками: нашёл, отметил нужных, закрыл.
 *
 * Порядок задаётся стрелками, а не порядком выбора: при последовательном
 * согласовании от него зависит, кто получит записку первым, и переставлять людей
 * должно быть можно, не собирая список заново.
 */
export function SzApproversField({
    value, onChange, users, parallel, onParallelChange, editable, lockedIds = [], onRoute = false,
}: Props) {
    const {t} = useTranslation();
    const [pickerOpen, setPickerOpen] = useState(false);

    const byId = useMemo(
        () => Object.fromEntries(users.map((u) => [u.id, u])) as Record<number, ApproverOption>,
        [users]);

    const locked = useMemo(() => new Set(lockedIds), [lockedIds]);

    const move = (index: number, delta: number) => {
        const next = [...value];
        const target = index + delta;
        if (target < 0 || target >= next.length) return;
        if (locked.has(next[index]) || locked.has(next[target])) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    const hasApprovers = value.length > 0;

    return (
        <div className="mt-4">
            {/* Подпись поля: «Согласующие» + счётчик, справа — режим согласования */}
            <div className="mb-[5px] flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[11.5px] text-[#4d5a72]">
                    {t("szCard.fields.approvers")}
                    {hasApprovers && (
                        <span className="rounded-full bg-[#eef3ff] px-[7px] py-[1px] text-[11px] font-semibold text-[#2f68f5]">
                            {value.length}
                        </span>
                    )}
                </span>
                {editable ? (
                    <PlainCheckbox tone="brand" checked={parallel} onChange={onParallelChange}>
                        {t("szCard.fields.parallel")}
                    </PlainCheckbox>
                ) : hasApprovers && (
                    <span className="text-[11.5px] text-[#8b97ab]">
                        {parallel ? t("szCard.fields.approversParallelHint") : t("szCard.fields.approversSequentialHint")}
                    </span>
                )}
            </div>

            {/* Кнопка выбора — в стиле поля выбора человека (UserPickerField) */}
            {editable && (
                <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none hover:bg-[#f6f8fb] focus:border-[#2f68f5]"
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <Users size={14} className="flex-none text-[#a3adbd]"/>
                        <span className={hasApprovers ? "text-[#1c2740]" : "text-[#a3adbd]"}>
                            {hasApprovers ? t("szCard.fields.approversChange") : t("szCard.fields.approversPick")}
                        </span>
                    </span>
                    <ChevronRight size={15} className="flex-none text-[#a3adbd]"/>
                </button>
            )}

            {pickerOpen && (
                <SzUserMultiPickerModal
                    accent="blue"
                    people={users}
                    value={value}
                    onChange={(ids) => onChange([
                        ...value.filter((x) => locked.has(x) && !ids.includes(x)),
                        ...ids,
                    ])}
                    title={t("szCard.fields.approversModalTitle")}
                    onClose={() => setPickerOpen(false)}
                />
            )}

            {!hasApprovers ? (
                <div className="mt-2 rounded-[10px] border border-dashed border-[#e5e9f0] bg-[#fafbfd] px-3 py-2.5 text-[12.5px] text-[#a3adbd]">
                    {t("szCard.fields.approversEmpty")}
                </div>
            ) : (
                <>
                    {/* Как пойдёт согласование — чтобы порядок строк читался правильно */}
                    {editable && (
                        <div className="mt-2 mb-1.5 text-[11.5px] text-[#8b97ab]">
                            {parallel ? t("szCard.fields.approversParallelHint") : t("szCard.fields.approversSequentialHint")}
                            {onRoute && <div className="mt-0.5">{t("szCard.fields.approversOnRouteHint")}</div>}
                        </div>
                    )}

                    <div className={`flex flex-col gap-1.5 ${editable ? "" : "mt-2"}`}>
                        {value.map((id, i) => {
                            const person = byId[id];
                            const name = person?.fullName ?? t("szCard.fields.approverUnknown", {id});
                            const meta = [person?.position, person?.orgUnit].filter(Boolean).join(" · ");
                            const isLocked = locked.has(id);
                            const upBlocked = i === 0 || isLocked || locked.has(value[i - 1]);
                            const downBlocked = i === value.length - 1 || isLocked || locked.has(value[i + 1]);
                            return (
                                <div
                                    key={id}
                                    className="flex items-center gap-2.5 rounded-[10px] border border-[#e9edf3] bg-white px-3 py-2"
                                >
                                    {/* Номер очереди — только при последовательном согласовании */}
                                    {!parallel && (
                                        <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-[#eef3ff] text-[11px] font-semibold text-[#2f68f5]">
                                            {i + 1}
                                        </span>
                                    )}

                                    <Avatar name={name} muted={!person} size={28}/>

                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-medium text-[#1c2740]">{name}</span>
                                        {meta && (
                                            <span className="block truncate text-[11.5px] text-[#8b97ab]">{meta}</span>
                                        )}
                                        {isLocked && (
                                            <span className="block truncate text-[11.5px] text-[#1c7a4d]">{t("szCard.fields.approverDecided")}</span>
                                        )}
                                    </span>

                                    {editable && !parallel && (
                                        <>
                                            <Tooltip content={t("szCard.fields.moveUp")} side="top" disabled={upBlocked}>
                                                <button
                                                    type="button"
                                                    onClick={() => move(i, -1)}
                                                    disabled={upBlocked}
                                                    aria-label={t("szCard.fields.moveUp")}
                                                    className={`${iconButtonClass} hover:bg-[#f2f5f9] hover:text-[#2f68f5]`}
                                                >
                                                    <ArrowUp size={14}/>
                                                </button>
                                            </Tooltip>
                                            <Tooltip content={t("szCard.fields.moveDown")} side="top" disabled={downBlocked}>
                                                <button
                                                    type="button"
                                                    onClick={() => move(i, 1)}
                                                    disabled={downBlocked}
                                                    aria-label={t("szCard.fields.moveDown")}
                                                    className={`${iconButtonClass} hover:bg-[#f2f5f9] hover:text-[#2f68f5]`}
                                                >
                                                    <ArrowDown size={14}/>
                                                </button>
                                            </Tooltip>
                                        </>
                                    )}
                                    {editable && !isLocked && (
                                        <Tooltip content={t("szCard.fields.removeApprover")} side="top">
                                            <button
                                                type="button"
                                                onClick={() => onChange(value.filter((x) => x !== id))}
                                                aria-label={t("szCard.fields.removeApprover")}
                                                className={`${iconButtonClass} hover:bg-[#fbeae7] hover:text-[#c0392b]`}
                                            >
                                                <X size={14}/>
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
