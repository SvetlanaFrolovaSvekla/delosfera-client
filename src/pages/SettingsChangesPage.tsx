import {useEffect, useState} from "react";
import {ArrowRight, MinusCircle, PencilLine, PlusCircle} from "lucide-react";
import {
    settingsChangeService, fieldTitle,
    CHANGE_KIND_ORDER, CHANGE_KIND_TITLE,
    type AreaSummary, type SettingsChange, type SettingsChangeKind,
} from "@/service/settingsChangeService/settingsChangeService.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {FilterChip, formatDateTime} from "@/components/componentsGeneral/DataTable.tsx";

/**
 * Журнал изменений настроек.
 *
 * Лентой, а не таблицей: у записи переменное число изменённых полей, и в таблице
 * они либо не помещаются, либо превращают строки в разновысокие. Ленту же читают
 * сверху вниз — как и положено журналу.
 *
 * Каждое изменение показано парой «было → стало». Одно название поля без
 * значений отвечает на «что трогали», но не на «что сломали».
 */

const KIND_ICON: Record<SettingsChangeKind, typeof PlusCircle> = {
    Added: PlusCircle,
    Modified: PencilLine,
    Deleted: MinusCircle,
};

const KIND_COLOR: Record<SettingsChangeKind, string> = {
    Added: "text-[#1c7a4d]",
    Modified: "text-[#2f68f5]",
    Deleted: "text-[#c0392b]",
};

export function SettingsChangesPage() {
    const [areas, setAreas] = useState<AreaSummary[]>([]);
    const [rows, setRows] = useState<SettingsChange[]>([]);
    const [total, setTotal] = useState(0);

    const [area, setArea] = useState("");
    const [kind, setKind] = useState<SettingsChangeKind | "">("");
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        settingsChangeService.areas().then(setAreas).catch(() => {});
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const result = await settingsChangeService.list({
                area: area || undefined,
                kind: kind || undefined,
                text: text.trim() || undefined,
                pageSize: 200,
            });
            setRows(result.items);
            setTotal(result.total);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [area, kind]);

    return (
        <div className="flex flex-col gap-5">
            <PageHeader
                title="Журнал изменений"
                description="Кто и когда правил справочники и настройки"
            />

            <div className="flex flex-wrap items-center gap-2">
                <FilterChip active={kind === ""} onClick={() => setKind("")}>Все</FilterChip>
                {CHANGE_KIND_ORDER.map((value) => (
                    <FilterChip key={value} active={kind === value} onClick={() => setKind(value)}>
                        {CHANGE_KIND_TITLE[value]}
                    </FilterChip>
                ))}

                <span className="mx-1 h-5 w-px bg-[#e1e7ef]"/>

                <select
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="rounded-[9px] border border-[#e1e7ef] px-3 py-1.5 text-[13px]
                               outline-none focus:border-[#2f68f5]"
                >
                    <option value="">Все области</option>
                    {areas.map((a) => (
                        <option key={a.area} value={a.area}>
                            {a.area} ({a.count})
                        </option>
                    ))}
                </select>

                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void load()}
                    placeholder="Название записи"
                    className="ml-auto w-[260px] rounded-[9px] border border-[#e1e7ef] px-3 py-1.5
                               text-[13px] outline-none transition focus:border-[#2f68f5]"
                />
            </div>

            {loading ? (
                <Loader label="Загружаем журнал…"/>
            ) : rows.length === 0 ? (
                <EmptyState
                    title="Записей нет"
                    description="Справочники и настройки за выбранный отбор не менялись."
                />
            ) : (
                <>
                    <div className="flex flex-col gap-2">
                        {rows.map((row) => (
                            <ChangeCard key={row.id} change={row}/>
                        ))}
                    </div>

                    {total > rows.length && (
                        <p className="text-[12.5px] text-[#8593a8]">
                            Показаны последние {rows.length} из {total}. Уточните отбор, чтобы увидеть остальное.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}

function ChangeCard({change}: {change: SettingsChange}) {
    const Icon = KIND_ICON[change.kind];

    // У заведения и удаления полей бывает под три десятка — показываем первые,
    // остальные прячем: в журнале смотрят на суть, а не на все реквизиты сразу.
    const [expanded, setExpanded] = useState(false);
    const limit = change.kind === "Modified" ? 20 : 6;
    const visible = expanded ? change.changes : change.changes.slice(0, limit);
    const hidden = change.changes.length - visible.length;

    return (
        <article className="rounded-[12px] border border-[#e1e7ef] bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Icon size={16} className={KIND_COLOR[change.kind]}/>
                <span className="text-[13px] font-semibold text-[#101a2c]">
                    {CHANGE_KIND_TITLE[change.kind]}
                </span>
                <span className="rounded-[5px] bg-[#eef2f7] px-2 py-0.5 text-[11.5px] text-[#4d5a72]">
                    {change.area}
                </span>
                <span className="text-[13px] text-[#101a2c]">
                    {change.entityTitle ?? `запись № ${change.entityId}`}
                </span>

                <span className="ml-auto flex items-center gap-3 text-[12px] text-[#8593a8]">
                    <span>{change.author ?? "—"}</span>
                    <span className="font-mono">{formatDateTime(change.at)}</span>
                </span>
            </div>

            {visible.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-[#eef2f7] pt-2">
                    {visible.map((field, index) => (
                        <div
                            key={index}
                            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]"
                        >
                            <span className="min-w-[160px] text-[#8593a8]">
                                {fieldTitle(field.field)}
                            </span>

                            {change.kind === "Modified" ? (
                                <>
                                    <span className="text-[#c0392b] line-through decoration-[#e0a9a1]">
                                        {field.before ?? "пусто"}
                                    </span>
                                    <ArrowRight size={13} className="text-[#a8b3c4]"/>
                                    <span className="font-medium text-[#1c7a4d]">
                                        {field.after ?? "пусто"}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[#4d5a72]">
                                    {field.after ?? field.before ?? "пусто"}
                                </span>
                            )}
                        </div>
                    ))}

                    {hidden > 0 && (
                        <button
                            type="button"
                            onClick={() => setExpanded(true)}
                            className="mt-0.5 self-start text-[12.5px] text-[#2f68f5] hover:underline"
                        >
                            показать ещё {hidden}
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}
