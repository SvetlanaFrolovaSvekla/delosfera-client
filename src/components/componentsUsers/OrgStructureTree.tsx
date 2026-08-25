import {useEffect, useMemo, useState} from "react";
import {Building2, ChevronRight, Users2} from "lucide-react";
import {
    orgTree, filterTree, totalStaff,
    type OrgTree, type OrgTreeNode,
} from "@/service/orgStructureService/orgTreeService.ts";
import {Loader} from "@/components/componentsGeneral/Loader";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

/**
 * Кто кому подчиняется.
 *
 * Дерево, а не таблица: подчинённость — это и есть вложение, и таблица его
 * либо теряет, либо изображает отступами, которые не свернуть.
 *
 * Править структуру отсюда нельзя. Её ведут в портале банка, и правка здесь
 * держалась бы до следующей синхронизации — то есть до ночи.
 */
export function OrgStructureTree() {
    const [tree, setTree] = useState<OrgTree | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

    useEffect(() => {
        orgTree()
            .then(setTree)
            .finally(() => setLoading(false));
    }, []);

    const roots = useMemo(
        () => (tree ? filterTree(tree.roots, search) : []),
        [tree, search],
    );

    // При поиске раскрываем всё: свёрнутый узел спрятал бы найденное,
    // и человек решил бы, что совпадений нет.
    const searching = search.trim().length > 0;

    const toggle = (id: number) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    if (loading) return <Loader label="Собираем структуру…"/>;
    if (!tree) return <EmptyState title="Структура не загрузилась" description="Попробуйте обновить страницу."/>;

    return (
        <div className="flex flex-col gap-4">

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[12px]
                            border border-[#e1e7ef] bg-white px-5 py-3.5">
                <Figure value={tree.unitsTotal} label="подразделений"/>
                {tree.orphans > 0 && (
                    <Figure
                        value={tree.orphans}
                        label="без места в структуре"
                        hint="Вышестоящее подразделение указано, но не найдено — показаны вверху списка"
                        alert
                    />
                )}

                <span className="ml-auto text-[12.5px] text-[#8593a8]">
                    {tree.lastSyncAt
                        ? `Из портала: ${new Date(tree.lastSyncAt).toLocaleString("ru-RU", {
                            day: "2-digit", month: "2-digit", year: "2-digit",
                            hour: "2-digit", minute: "2-digit",
                          })}`
                        : "Из портала ещё не забирали"}
                </span>
            </div>

            <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию подразделения или начальнику"
                className="w-full max-w-[420px] rounded-[9px] border border-[#e1e7ef] px-3 py-2
                           text-[13px] outline-none transition focus:border-[#2f68f5]"
            />

            {roots.length === 0 ? (
                <EmptyState
                    title="Ничего не нашлось"
                    description="По этому запросу подразделений нет."
                />
            ) : (
                <div className="overflow-hidden rounded-[12px] border border-[#e1e7ef] bg-white">
                    {roots.map((node) => (
                        <Node
                            key={node.id}
                            node={node}
                            depth={0}
                            collapsed={collapsed}
                            toggle={toggle}
                            forceOpen={searching}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function Node({node, depth, collapsed, toggle, forceOpen}: {
    node: OrgTreeNode;
    depth: number;
    collapsed: Set<number>;
    toggle: (id: number) => void;
    forceOpen: boolean;
}) {
    const hasChildren = node.children.length > 0;
    const open = forceOpen || !collapsed.has(node.id);

    // Значок по виду из портала. Раньше вид угадывался по вложенности, и
    // управление без отделов рисовалось отделом, а комитет с отделами — управлением.
    const Icon = node.kind === "Отдел" ? Users2 : Building2;

    const inside = totalStaff(node);

    return (
        <>
            <div
                className="flex items-center gap-2 border-b border-[#f2f5f9] px-3 py-2.5
                           transition last:border-b-0 hover:bg-[#f8fafc]"
                style={{paddingLeft: 12 + depth * 22}}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        onClick={() => toggle(node.id)}
                        aria-label={open ? "Свернуть" : "Развернуть"}
                        className="flex h-5 w-5 flex-none items-center justify-center rounded
                                   text-[#8593a8] transition hover:bg-[#eef2f7]"
                    >
                        <ChevronRight
                            size={14}
                            className={`transition-transform ${open ? "rotate-90" : ""}`}
                        />
                    </button>
                ) : (
                    <span className="h-5 w-5 flex-none"/>
                )}

                <span className="grid h-8 w-8 flex-none place-items-center rounded-[8px]
                                 border border-[#e8edf5] bg-white">
                    <Icon size={15} className="text-[#5b6b85]"/>
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-[#101a2c]">
                        {node.title}
                    </span>
                    <span className="block truncate text-[11.5px] text-[#8593a8]">
                        {node.kind && <>{node.kind} · </>}
                        {node.head
                            ? <>нач. {node.head}</>
                            : <span className="text-[#a8b3c4]">начальник не назначен</span>}
                        {node.curator && <> · куратор {node.curator}</>}
                        {node.staffCount > 0 && <> · {node.staffCount} чел.</>}
                        {hasChildren && inside !== node.staffCount && <> · всего {inside}</>}
                    </span>
                </span>

                {!node.fromPortal && (
                    <span
                        title="Заведено здесь, в портале такого подразделения нет"
                        className="flex-none rounded-[5px] bg-[#eef2f7] px-2 py-0.5 text-[10.5px] text-[#5b6b85]"
                    >
                        своё
                    </span>
                )}
            </div>

            {open && node.children.map((child) => (
                <Node
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    collapsed={collapsed}
                    toggle={toggle}
                    forceOpen={forceOpen}
                />
            ))}
        </>
    );
}

function Figure({value, label, hint, alert}: {
    value: number; label: string; hint?: string; alert?: boolean;
}) {
    return (
        <span className="flex flex-col gap-0.5" title={hint}>
            <span className={`font-mono text-[20px] font-bold leading-none tabular-nums
                              ${alert ? "text-[#b3372a]" : "text-[#101a2c]"}`}>
                {value}
            </span>
            <span className="text-[11.5px] text-[#8593a8]">{label}</span>
        </span>
    );
}
