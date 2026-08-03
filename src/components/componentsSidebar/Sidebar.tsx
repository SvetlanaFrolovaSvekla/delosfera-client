import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {ChevronRight} from "lucide-react";
import {CountBadge} from "@/components/componentsSidebar/CountBadge.tsx";
import {Icon} from "@/components/icons/Icon";
import {navGroups} from "@/service/mockData/SidebarData.tsx";
import {RUBRICS} from "@/service/mockData/DictionaryData.tsx";
import {RubricTreeModal} from "@/components/componentsGeneral/selects/MultiSelects/RubricTreeModal.tsx";

// Id пунктов, которые открывают модалку вместо перехода на страницу
const MODAL_ITEM_IDS = ["vnd-rubric"];

export function Sidebar() {
    const {t} = useTranslation();
    const {pathname} = useLocation();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false); // Свернутость панели
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    const [rubricSelection, setRubricSelection] = useState<string[]>([]);

    const goToVndWithRubrics = (keys: string[]) => {
        if (keys.length === 0) return;
        const params = new URLSearchParams({rubrics: keys.join(",")});
        navigate(`/basevnd?${params.toString()}`);
        setRubricModalOpen(false);
    };

    return (
        <aside
            className="flex flex-none flex-col overflow-hidden border-r border-[#e5e9f0] bg-white transition-[width] duration-400 ease-in-out"
            style={{width: collapsed ? 72 : 248}}
        >
            {/* Логотип */}
            <Link
                to="/"
                className={`group flex h-[60px] flex-none items-center gap-[11px] overflow-hidden border-b border-[#eef2f7] ${
                    collapsed ? "justify-center px-0" : "px-[18px]"
                }`}
            >
                <div
                    className="grid h-8 w-8 flex-none place-items-center rounded-[9px] bg-[var(--brand,#24a36b)] shadow-[0_3px_10px_-3px_var(--brand,#24a36b)] transition-transform duration-400 group-hover:scale-110">
                    <Icon name="cube" width={18} height={18} stroke="#ffffff" strokeWidth={2}/>
                </div>
                {!collapsed && (
                    <div className="min-w-0 text-[#0f1b2d]">
                        <div
                            className="text-[15px] font-bold leading-none tracking-[-0.01em]">{t("sidebar.appName")}</div>
                        <div
                            className="mt-[3px] text-[10.5px] font-medium tracking-[0.04em] text-[#8b97ab]">{t("sidebar.appSub")}</div>
                    </div>
                )}
            </Link>

            {/* Навигация */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-5 pt-3">
                {navGroups.map((grp, i) => (
                    <div key={i} className="mb-1.5">
                        {grp.titleKey && !collapsed && (
                            <div className="mb-1 mt-3 px-2.5">
                                <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#a3adbd]">
                                    {t(grp.titleKey)}
                                </div>
                            </div>
                        )}
                        {grp.items.map((it) => {
                            const isActive = it.path ? pathname === it.path : false;
                            const label = t(it.labelKey);
                            const isModalItem = MODAL_ITEM_IDS.includes(it.id);

                            const content = (
                                <>
                                    {isActive && (
                                        <span
                                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-[3px]"
                                            style={{background: "var(--app-accent, #4e57d6)"}}
                                        />
                                    )}
                                    <span className="relative flex-none">
                                        <Icon name={it.icon} width={19} height={19}/>
                                        {collapsed && !!it.badge && <CountBadge count={it.badge} dot/>}
                                    </span>
                                    {!collapsed && (
                                        <>
                                            <span
                                                className={`flex-1 text-left whitespace-normal break-words leading-snug ${isActive ? "font-bold" : "font-medium"}`}>
                                                {label}
                                            </span>
                                            {isModalItem ? (
                                                <ChevronRight className="w-[16px] h-[16px] flex-none text-[#a3adbd] mt-0.5"
                                                              strokeWidth={2}/>
                                            ) : (
                                                !!it.badge && <CountBadge count={it.badge}/>
                                            )}
                                        </>
                                    )}
                                </>
                            );

                            const sharedClassName = `cursor-pointer relative mb-0.5 flex w-full items-start overflow-hidden rounded-[9px] text-[13px] font-medium transition-all duration-200 ${
                                collapsed ? "justify-center gap-0 px-0 py-[10px]" : "gap-[11px] px-[11px] py-[9px]"
                            }`;
                            const sharedStyle = {
                                background: isActive ? "var(--app-soft, #ececfc)" : "transparent",
                                color: isActive ? "var(--app-accent, #4e57d6)" : "#4a566d",
                            };

                            if (it.path) {
                                return (
                                    <Link
                                        key={it.id}
                                        to={it.path}
                                        title={label}
                                        className={sharedClassName}
                                        style={sharedStyle}
                                    >
                                        {content}
                                    </Link>
                                );
                            }

                            return (
                                <button
                                    key={it.id}
                                    title={label}
                                    className={sharedClassName}
                                    style={sharedStyle}
                                    onClick={() => {
                                        if (it.id === "vnd-rubric") {
                                            setRubricModalOpen(true);
                                        }
                                    }}
                                >
                                    {content}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* Свернуть меню */}
            <div className="flex-none border-t border-[#eef2f7] p-2.5">
                <button
                    onClick={() => setCollapsed((c) => !c)}
                    className={`cursor-pointer flex w-full items-center overflow-hidden whitespace-nowrap rounded-[9px] text-[13px] text-[#55617a] hover:bg-[#f2f5f9] ${
                        collapsed ? "justify-center gap-0 px-0 py-[10px]" : "gap-[11px] px-[11px] py-[9px]"
                    }`}
                >
                    <Icon
                        name="chevr"
                        width={18}
                        height={18}
                        className="flex-none transition-transform"
                        style={{transform: collapsed ? "rotate(0deg)" : "rotate(180deg)"}}
                    />
                    {!collapsed && <span>{t("sidebar.collapse")}</span>}
                </button>
            </div>

            {/* Модалка «Рубрикатор ВНД» */}
            <RubricTreeModal
                open={rubricModalOpen}
                onClose={() => setRubricModalOpen(false)}
                title={t("sidebar.items.vndRubric")}
                options={RUBRICS.map((r) => ({key: r.id, label: r.name, parentId: r.parentId}))}
                selectedKeys={rubricSelection}
                onApply={(keys) => {
                                      setRubricSelection(keys);
                                        goToVndWithRubrics(keys);
                                  }}
                searchPlaceholder="Поиск рубрики…"
                onGoToRubric={(key) => goToVndWithRubrics([key])}
            />
        </aside>
    );
}