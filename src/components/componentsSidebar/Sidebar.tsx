import {useState, useEffect} from "react";
import {useAuth} from "@/context/AuthContext.ts";
import {useTranslation} from "react-i18next";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {notificationsService} from "@/service/notificationsService/notificationsService.ts";
import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {useVndActualizationSummary} from "@/hooks/vndHooks/useVndActualizationSummary.tsx";
import {useVndTaskCounts} from "@/hooks/tasksVndHooks/useVndTaskCounts.ts";
import {navGroups} from "@/constants/sidebarData.tsx";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {CountBadge} from "@/components/componentsSidebar/CountBadge.tsx";
import {
    VND_PROPOSALS_CHANGED_EVENT,
    vndProposalService,
} from "@/service/vndProposalService/vndProposalService.ts";
import {RubricTreeModal} from "@/components/componentsGeneral/rubricator/RubricTreeModal.tsx";

import {Icon} from "@/assets/icons/Icon";
import {ChevronRight, PanelLeftClose, PanelLeftOpen} from "lucide-react";

const MODAL_ITEM_IDS = ["rubric"];

type RubricVariant = "vnd" | "sz";

/**
 * Состояние панели переживает перезагрузку: тот, кто её спрятал ради места на
 * экране, не хочет прятать её заново после каждого входа.
 */
const COLLAPSED_KEY = "delosfera.sidebar.collapsed";
const HIDDEN_KEY = "delosfera.sidebar.hidden";

function readFlag(key: string): boolean {
    return localStorage.getItem(key) === "1";
}

function writeFlag(key: string, value: boolean): void {
    if (value) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
}

export function Sidebar() {
    const {t} = useTranslation();
    const {pathname} = useLocation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const [collapsed, setCollapsed] = useState(() => readFlag(COLLAPSED_KEY));
    const [hidden, setHidden] = useState(() => readFlag(HIDDEN_KEY));
    const [rubricModalOpen, setRubricModalOpen] = useState(false);
    // Какой рубрикатор сейчас показан в модалке — по умолчанию ВНД (GEN-15/попросили
    // оставить его первым). У каждого — своя выборка отмеченных рубрик: переключение
    // варианта не должно терять то, что уже выбрано в другом.
    const [rubricVariant, setRubricVariant] = useState<RubricVariant>("vnd");
    const [vndRubricSelection, setVndRubricSelection] = useState<string[]>([]);
    const [szRubricSelection, setSzRubricSelection] = useState<string[]>([]);

    const {rubricOptions, szRubricOptions} = useDictionaries();
    const activeRubricOptions = rubricVariant === "vnd" ? rubricOptions : szRubricOptions;
    const activeRubricSelection = rubricVariant === "vnd" ? vndRubricSelection : szRubricSelection;
    const setActiveRubricSelection = rubricVariant === "vnd" ? setVndRubricSelection : setSzRubricSelection;

    // Планирование актуализации: Просрочено + Критический срок. Отдельное право от
    // ViewVndActualizationPage (тот открывает саму страницу и со временем станет доступен
    // всем ролям) — без ViewVndActualizationOverdueBadge кружок на сайдбаре не показывается,
    // даже если сам пункт меню виден.
    const {summary: actualizationSummary} = useVndActualizationSummary();
    const planningBadge = hasPermission(PermissionCode.ViewVndActualizationOverdueBadge)
        ? (actualizationSummary?.critical ?? 0) + (actualizationSummary?.overdue ?? 0)
        : 0;

    // Мои задачи: Согласование (ждущие меня) + Актуализация + Консолидация
    const {counts: taskCounts} = useVndTaskCounts();
    const tasksBadge = taskCounts.coordination + taskCounts.actualization + taskCounts.consolidation;
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        notificationsService
            .getCounts()
            .then((c) => setUnreadCount(c.totalUnread))
            .catch(() => {
                // счётчик не критичен — просто не показываем бейдж
            });
    }, []);

    // Предложения по ВНД: непрочитанные - только у получателей (право ManageVndProposals).
    // Перечитываются по событию со страницы "Предложения по ВНД"/после отправки и раз в 2 минуты.
    const canSeeProposals = hasPermission(PermissionCode.ManageVndProposals);
    const [proposalsUnread, setProposalsUnread] = useState(0);
    useEffect(() => {
        if (!canSeeProposals) return;
        let cancelled = false;
        const refresh = () => {
            vndProposalService.counts()
                .then((c) => {
                    if (!cancelled) setProposalsUnread(c.unread);
                })
                .catch(() => {
                    // счётчик не критичен
                });
        };
        refresh();
        const timer = setInterval(refresh, 120_000);
        window.addEventListener(VND_PROPOSALS_CHANGED_EVENT, refresh);
        return () => {
            cancelled = true;
            clearInterval(timer);
            window.removeEventListener(VND_PROPOSALS_CHANGED_EVENT, refresh);
        };
    }, [canSeeProposals]);

    const dynamicBadges: Record<string, number> = {
        "vnd-proposals": canSeeProposals ? proposalsUnread : 0,
        pln: planningBadge,
        tasks: tasksBadge,
        notif: unreadCount,
    };

    const dynamicBadgeTooltips: Record<string, string> = {
        "vnd-proposals": t("sidebar.badgeTooltips.proposals", {count: proposalsUnread}),
        pln: t("sidebar.badgeTooltips.planning", {count: planningBadge}),
        tasks: t("sidebar.badgeTooltips.tasks", {count: tasksBadge}),
        notif: t("sidebar.badgeTooltips.notif", {count: unreadCount}),
    };

    const toggleCollapsed = () => {
        setCollapsed((c) => {
            writeFlag(COLLAPSED_KEY, !c);
            return !c;
        });
    };

    const setHiddenPersisted = (value: boolean) => {
        writeFlag(HIDDEN_KEY, value);
        setHidden(value);
    };

    // Рубрикатор ВНД ведёт в реестр ВНД, Рубрикатор СЗ — в реестр служебных записок;
    // сама фильтрация по ?rubrics= на стороне /sz — отдельная задача (там сейчас
    // читает этот параметр только страница ВНД, см. useRubricsFromUrl.ts).
    const goToRubricRegistry = (variant: RubricVariant, keys: string[]) => {
        if (keys.length === 0) return;
        const params = new URLSearchParams({rubrics: keys.join(",")});
        navigate(variant === "vnd" ? `/base-vnd?${params.toString()}` : `/sz?${params.toString()}`);
        setRubricModalOpen(false);
    };

    const visibleGroups = navGroups
        .map((grp) => ({
            ...grp,
            items: grp.items
                .filter((it) => it.permission === undefined || hasPermission(it.permission))
                .map((it) => ({
                    ...it,
                    badge: dynamicBadges[it.id] ?? it.badge,
                })),
        }))
        .filter((grp) => grp.items.length > 0);

    // Панель спрятана целиком — на её месте остаётся только стрелка возврата.
    // Кнопка держится у края экрана, а не в шапке: там её ищут глазами по тому
    // же месту, где панель и была.
    if (hidden) {
        return (
            <button
                type="button"
                onClick={() => setHiddenPersisted(false)}
                title={t("sidebar.showMenu")}
                aria-label={t("sidebar.showMenu")}
                className="fixed left-0 top-[70px] z-30 grid h-9 w-7 place-items-center
                           rounded-r-[9px] border border-l-0 border-[#e5e9f0] bg-white
                           text-[#8b97ab] shadow-sm transition hover:text-[#2f68f5]"
            >
                <PanelLeftOpen size={17}/>
            </button>
        );
    }

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
                {visibleGroups.map((grp, i) => (
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
                                        {collapsed && !!it.badge && (
                                            <CountBadge count={it.badge} tooltip={dynamicBadgeTooltips[it.id]} tooltipSide="right"/>
                                        )}
                                    </span>
                                    {!collapsed && (
                                        <>
                                            <span
                                                className={`flex-1 text-left whitespace-normal break-words leading-snug ${isActive ? "font-bold" : "font-medium"}`}>
                                                {label}
                                            </span>
                                            {isModalItem ? (
                                                <ChevronRight
                                                    className="w-[16px] h-[16px] flex-none text-[#a3adbd] mt-0.5"
                                                    strokeWidth={2}/>
                                            ) : (
                                                !!it.badge &&
                                                <CountBadge count={it.badge} tooltip={dynamicBadgeTooltips[it.id]}/>
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
                                    className={sharedClassName}
                                    style={sharedStyle}
                                    onClick={() => {
                                        if (it.id === "rubric") {
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

            {/* Свернуть до значков или спрятать целиком */}
            <div className={`flex flex-none items-center gap-1 border-t border-[#eef2f7] p-2.5
                             ${collapsed ? "flex-col" : ""}`}>
                <button
                    onClick={toggleCollapsed}
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

                <button
                    onClick={() => setHiddenPersisted(true)}
                    title={t("sidebar.hideMenu")}
                    aria-label={t("sidebar.hideMenu")}
                    className="flex-none cursor-pointer rounded-[9px] p-[9px] text-[#8b97ab]
                               transition hover:bg-[#f2f5f9] hover:text-[#2f68f5]"
                >
                    <PanelLeftClose size={18}/>
                </button>
            </div>

            {/* Модалка «Рубрикатор» — переключатель внутри модалки выбирает ВНД или СЗ */}
            <RubricTreeModal
                open={rubricModalOpen}
                onClose={() => setRubricModalOpen(false)}
                title={t("sidebar.items.rubric")}
                options={activeRubricOptions}
                selectedKeys={activeRubricSelection}
                onApply={(keys) => {
                    setActiveRubricSelection(keys);
                    goToRubricRegistry(rubricVariant, keys);
                }}
                searchPlaceholder={t("createVnd.classifiers.rubricSearchPlaceholder")}
                onGoToRubric={(key) => goToRubricRegistry(rubricVariant, [key])}
                variantOptions={[
                    {value: "vnd", label: t("rubricTreeModal.variantVnd")},
                    {value: "sz", label: t("rubricTreeModal.variantSz")},
                ]}
                variantValue={rubricVariant}
                onVariantChange={(v) => setRubricVariant(v as RubricVariant)}
            />
        </aside>
    );
}