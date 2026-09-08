import {useEffect, useState} from "react";
import {Check, X, FileText, Pencil, Clock, Info} from "lucide-react";
import {activityLogService, type DocumentHistoryEntry}
    from "@/service/activityLogService/activityLogService.ts";

/**
 * История действий по документу — общая для всех контуров.
 *
 * Строится из технического аудита, который пишут все контуры; отдельного журнала
 * ни у кого, кроме ВНД, не было. Один компонент кладётся на любую карточку —
 * записку, закупку, договор, письмо.
 */

const ICONS: Record<string, typeof Info> = {
    check: Check, x: X, doc: FileText, edit: Pencil, clock: Clock, info: Info,
};

const ЦВЕТ: Record<string, string> = {
    check: "#1c7a4d", x: "#b5352f", clock: "#8a6d1f",
    doc: "#2f68f5", edit: "#55617a", info: "#8b97ab",
};

const когда = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
};

export function DocumentHistory({entityType, entityId, assignmentIds}: {
    entityType: string;
    entityId: number;
    /** Дочерние сущности, чьи события входят в ту же ленту (поручения записки). */
    assignmentIds?: number[];
}) {
    const [rows, setRows] = useState<DocumentHistoryEntry[] | null>(null);

    useEffect(() => {
        let живо = true;
        activityLogService.history(entityType, entityId, assignmentIds)
            .then((r) => { if (живо) setRows(r); })
            .catch(() => { if (живо) setRows([]); });
        return () => { живо = false; };
    }, [entityType, entityId, assignmentIds]);

    if (rows === null) return null;

    return (
        <section className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <h2 className="m-0 mb-3 text-[15px] font-semibold text-[#0f1b2d]">История</h2>

            {rows.length === 0 && (
                <div className="text-[13px] text-[#8b97ab]">Действий по документу пока нет.</div>
            )}

            <div className="flex flex-col">
                {rows.map((r, i) => {
                    const Icon = ICONS[r.icon] ?? Info;
                    const цвет = ЦВЕТ[r.icon] ?? "#8b97ab";
                    return (
                        <div key={r.id} className="flex gap-3">
                            {/* Вертикаль ленты: точка события и линия к следующему. */}
                            <div className="flex flex-col items-center flex-none">
                                <span className="grid h-7 w-7 place-items-center rounded-full"
                                      style={{background: `${цвет}14`, color: цвет}}>
                                    <Icon size={14}/>
                                </span>
                                {i < rows.length - 1 && <span className="w-px flex-1 bg-[#eef2f7]"/>}
                            </div>

                            <div className="pb-4 min-w-0">
                                <div className="text-[13.5px] text-[#1c2740]">{r.text}</div>
                                <div className="text-[11.5px] text-[#a3adbd] mt-0.5">{когда(r.at)}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
