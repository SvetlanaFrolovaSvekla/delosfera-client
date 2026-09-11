// Модалка с иерархическим списком, одиночным выбором
import {useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {ChevronRight, X} from "lucide-react";
import {HighlightText} from "@/utils/HighlightText.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";

export interface TreeSelectOption {
    key: string;
    label: string;
    parentId?: string;
}

interface TreeNode extends TreeSelectOption {
    children: TreeNode[];
}

interface TreeSingleSelectModalProps {
    open: boolean;
    onClose: () => void;

    title: string;
    description?: string;

    options: TreeSelectOption[];
    selectedKey: string | null;
    onSelect: (key: string | null) => void;

    searchPlaceholder?: string;
    clearLabel?: string;
    // Текст кнопки очистки, когда выбор уже снят (selectedKey === null, кнопка неактивна) —
    // по умолчанию используется тот же clearLabel, но, например, в фильтре СП внутри
    // AssignResponsiblesModal здесь показывается развёрнутое пояснение вместо ярлыка действия.
    clearedLabel?: string;
}

function buildTree(options: TreeSelectOption[]): TreeNode[] {
    const nodeMap = new Map<string, TreeNode>(
        options.map((o) => [o.key, {...o, children: []}])
    );
    const roots: TreeNode[] = [];

    nodeMap.forEach((node) => {
        if (node.parentId && nodeMap.has(node.parentId)) {
            nodeMap.get(node.parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

// По умолчанию при открытии модалки сворачиваем все узлы с детьми, КРОМЕ цепочки родителей
// уже выбранного узла - так сразу видно, где в структуре находится текущий выбор, а не только
// его собственное название без контекста (важно, когда одноимённые СП повторяются в каждом
// из филиалов - см. миграцию isrib->delosfera). Раньше здесь при каждом открытии просто
// разворачивалось всё дерево целиком (пустой collapsed) - неюзабельно на ~200 подразделениях.
function collectDefaultCollapsed(options: TreeSelectOption[], selectedKey: string | null): Set<string> {
    const byKey = new Map(options.map((o) => [o.key, o]));

    // Ключи всех узлов, у которых есть дети - потенциально сворачиваемые
    const withChildren = new Set<string>();
    options.forEach((o) => {
        if (o.parentId) withChildren.add(o.parentId);
    });

    // Цепочка родителей выбранного узла - остаётся развёрнутой
    const ancestors = new Set<string>();
    let current = selectedKey ? byKey.get(selectedKey) : undefined;
    while (current?.parentId) {
        ancestors.add(current.parentId);
        current = byKey.get(current.parentId);
    }

    const collapsed = new Set<string>();
    withChildren.forEach((key) => {
        if (!ancestors.has(key)) collapsed.add(key);
    });
    return collapsed;
}

// Возвращает узлы, которые сами совпадают с запросом или содержат совпадающих потомков
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
    const q = query.toLowerCase();
    return nodes
        .map((node) => {
            const filteredChildren = filterTree(node.children, query);
            const selfMatches = node.label.toLowerCase().includes(q);
            if (selfMatches || filteredChildren.length > 0) {
                return {...node, children: filteredChildren};
            }
            return null;
        })
        .filter((n): n is TreeNode => n !== null);
}

export function TreeSingleSelectModal({
                                          open,
                                          onClose,
                                          title,
                                          description,
                                          options,
                                          selectedKey,
                                          onSelect,
                                          searchPlaceholder,
                                          clearLabel,
                                          clearedLabel,
                                      }: TreeSingleSelectModalProps) {
    const {t} = useTranslation();
    const [query, setQuery] = useState("");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [prevOpen, setPrevOpen] = useState(open);
    const panelRef = useRef<HTMLDivElement>(null);

    // Сброс поиска/раскрытых узлов при каждом открытии — обновление state во время рендера.
    // Разворачиваем только цепочку родителей текущего выбора (см. collectDefaultCollapsed),
    // остальное сворачиваем.
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setQuery("");
            setCollapsed(collectDefaultCollapsed(options, selectedKey));
        }
    }

    if (!open) return null;

    const tree = buildTree(options);
    const isSearching = query.trim().length > 0;
    const visibleTree = isSearching ? filterTree(tree, query.trim()) : tree;

    const toggleCollapse = (key: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    // Радио-поведение: клик по узлу сразу выбирает и закрывает модалку
    const handlePick = (node: TreeNode) => {
        onSelect(node.key);
        onClose();
    };

    // Тот же результат, что и выбор узла (handlePick) — выбор снят/задан, модалка закрывается.
    const handleClear = () => {
        onSelect(null);
        onClose();
    };

    const handleBackdropClick = () => {
        panelRef.current?.animate(
            [
                {transform: "translateX(0)"},
                {transform: "translateX(-3px)"},
                {transform: "translateX(3px)"},
                {transform: "translateX(-2px)"},
                {transform: "translateX(2px)"},
                {transform: "translateX(0)"},
            ],
            {duration: 220, easing: "ease-in-out"}
        );
    };

    const renderNode = (node: TreeNode, depth: number) => {
        const on = node.key === selectedKey;
        const hasChildren = node.children.length > 0;
        // Во время поиска раскрываем всё принудительно - иначе совпадение под свёрнутым по
        // умолчанию узлом (см. collectDefaultCollapsed) было бы не видно в результатах.
        const isCollapsed = !isSearching && collapsed.has(node.key);

        return (
            <div key={node.key}>
                <div
                    className="w-full flex items-center gap-[7px] px-2.5 py-[9px] rounded-lg hover:bg-[#f6f8fb]"
                    style={{paddingLeft: `${10 + depth * 20}px`}}
                >
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => toggleCollapse(node.key)}
                            className="w-4 h-4 flex-none grid place-items-center text-[#a3adbd] cursor-pointer"
                        >
                            <ChevronRight
                                className={`w-[13px] h-[13px] transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                                strokeWidth={2.5}
                            />
                        </button>
                    ) : (
                        <span className="w-4 h-4 flex-none"/>
                    )}

                    <button
                        type="button"
                        onClick={() => handlePick(node)}
                        className="flex-1 flex items-center gap-[11px] text-left cursor-pointer"
                    >
                        <span
                            className={`w-5 h-5 flex-none rounded-full grid place-items-center border-[1.5px] ${
                                on ? "border-[#4e57d6]" : "border-[#cbd3df]"
                            } bg-white`}
                        >
                            {on && <span className="w-[9px] h-[9px] rounded-full bg-[#4e57d6]"/>}
                        </span>
                        <span className={`text-[13.5px] ${on ? "text-[#1c2740] font-semibold" : "text-[#26324a]"}`}>
                            <HighlightText text={node.label} query={query}/>
                        </span>
                    </button>
                </div>

                {hasChildren && !isCollapsed && (
                    <div>
                        {node.children.map((child) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden flex flex-col"
            >
                {/* Заголовок */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7] flex-none">
                    <div className="pr-4">
                        <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                            {title}
                        </h3>

                        {description && (
                            <p className="mt-1.5 mb-0 text-[12px] font-normal leading-[17px] text-[#8b97ab]">
                                {description}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                {/* Поиск */}
                <div className="px-5 pt-4 pb-2 flex-none">
                    <SearchBar
                        variant="gray"
                        value={query}
                        onChange={setQuery}
                        placeholder={searchPlaceholder ?? t("general.search")}
                    />
                </div>

                {/* Очистить выбор */}
                <div className="flex items-center justify-start px-5 pb-2 flex-none">
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={selectedKey === null}
                        className={`text-[13px] font-semibold cursor-pointer ${
                            selectedKey === null
                                ? "text-[#c3ccd8] cursor-default"
                                : "text-[#4e57d6] hover:underline"
                        }`}
                    >
                        {selectedKey === null
                            ? (clearedLabel ?? clearLabel ?? "Очистить выбор")
                            : (clearLabel ?? "Очистить выбор")}
                    </button>
                </div>

                {/* Дерево */}
                <div className="flex-1 overflow-y-auto p-2">
                    {visibleTree.length === 0 && (
                        <div className="px-3 py-8 text-center text-[13px] text-[#a3adbd]">
                            {t("general.notFound")}
                        </div>
                    )}
                    {visibleTree.map((node) => renderNode(node, 0))}
                </div>
            </div>
        </div>
    );
}