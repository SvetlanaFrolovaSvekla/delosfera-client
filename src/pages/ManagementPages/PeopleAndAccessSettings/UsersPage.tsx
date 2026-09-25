// Страница "Пользователи" - выдача ролей, доступов, редактирование профилей
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";

import type {UserResponse, UserSource} from "@/service/userService/userServiceType.ts";
import {JOURNAL} from "@/service/journalViewService/journalViewService.ts";
import {toast} from "@/service/toastService.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {useUsersList, type UserStatusScope} from "@/hooks/userHooks/useUsersList.ts";
import {useUsersColumnVisibility} from "@/hooks/userHooks/useUsersColumnVisibility.ts";
import {useJournalViews} from "@/hooks/useJournalViews.ts";

import {UsersPageHeader} from "@/components/componentsUsers/UsersPageHeader.tsx";
import {UsersFilters} from "@/components/componentsUsers/UsersFilters.tsx";
import {UsersTable} from "@/components/componentsUsers/UsersTable.tsx";
import {OrgStructureTree} from "@/components/componentsUsers/OrgStructureTree.tsx";

import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import {JournalViewPicker} from "@/components/componentsGeneral/JournalViewPicker.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {ChevronLeft, ChevronRight} from "lucide-react";

// Состояние ожидающего подтверждения действия блокировки/разблокировки
type PendingUserAction = {
    user: UserResponse;
    type: "block" | "unblock";
};

type View = "people" | "structure";

export function UsersPage() {
    const {t} = useTranslation();
    const [view, setView] = useState<View>("people");
    const navigate = useNavigate();
    const {
        search, setSearch,
        sortBy, setSortBy,
        statusScope, setStatusScope,
        sourceFilters, toggleSourceFilter,
        orgUnitFilters, setOrgUnitFilters,
        positionFilters, setPositionFilters,
        roleFilters, setRoleFilters,
        roles,
        resetFilters,
        users, counts,
        page, setPage, total, pageSize,
        loading, error,
        blockUser, unblockUser,
    } = useUsersList();

    const {
        visibleCols, toggleColumn, selectAllColumns, deselectAllColumns,
        columns, gridTemplate, toggleableColumns,
        currentColumns, applyColumns, defaultColumns,
    } = useUsersColumnVisibility();

    const {hasPermission} = useAuth();
    const views = useJournalViews(JOURNAL.Users, currentColumns, applyColumns);

    const [advOpen, setAdvOpen] = useState(false);

    // Модалка подтверждения блокировки/разблокировки
    const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const openBlockConfirm = (user: UserResponse) => {
        setActionError(null);
        setPendingAction({user, type: "block"});
    };

    const openUnblockConfirm = (user: UserResponse) => {
        setActionError(null);
        setPendingAction({user, type: "unblock"});
    };

    const closeActionModal = () => {
        if (actionLoading) return;
        setPendingAction(null);
        setActionError(null);
    };

    const handleConfirmAction = async () => {
        if (!pendingAction) return;
        const {user, type} = pendingAction;

        setActionLoading(true);
        setActionError(null);
        try {
            if (type === "block") {
                await blockUser(user);
            } else {
                await unblockUser(user);
            }
            setPendingAction(null);

            // toast.success(
            //     type === "block" ? "Пользователь заблокирован" : "Пользователь разблокирован",
            //     `«${user.fullName}»`
            // );
            toast.success(
                type === "block"
                    ? t("usersPage.toastBlockedTitle")
                    : t("usersPage.toastUnblockedTitle"),
                `«${user.fullName}»`
            );
        } catch (e) {
            // const message = e instanceof Error ? e.message : "Не удалось выполнить действие. Попробуйте ещё раз.";
            const message = e instanceof Error ? e.message : t("usersPage.actionErrorFallback");
            setActionError(message);
            // toast.error(
            //     type === "block" ? "Не удалось заблокировать пользователя" : "Не удалось разблокировать пользователя",
            //     message
            // );
            toast.error(
                type === "block"
                    ? t("usersPage.toastBlockFailedTitle")
                    : t("usersPage.toastUnblockFailedTitle"),
                message
            );
        } finally {
            setActionLoading(false);
        }
    };

    // const scopeTabs = [
    //     {id: "all" as UserStatusScope, label: "Все", n: counts.all},
    //     {id: "active" as UserStatusScope, label: "Активные", n: counts.active},
    //     {id: "blocked" as UserStatusScope, label: "Заблокированные", n: counts.blocked},
    // ];
    const scopeTabs = [
        {id: "all" as UserStatusScope, label: t("usersPage.scopeAll"), n: counts.all},
        {id: "active" as UserStatusScope, label: t("usersPage.scopeActive"), n: counts.active},
        {id: "blocked" as UserStatusScope, label: t("usersPage.scopeBlocked"), n: counts.blocked},
    ];

    const hasActiveFilters =
        sourceFilters.length > 0 ||
        orgUnitFilters.length > 0 ||
        positionFilters.length > 0 ||
        roleFilters.length > 0;
    const isSearching = search.trim().length > 0;

    // Текст справа от фильтров
    let countLabel: string;
    if (isSearching || hasActiveFilters) {
        // Total, а не число строк на экране: показывается одна страница, а найдено больше.
        // countLabel = `Найдено учётных записей: ${total} из ${counts.all}`;
        countLabel = t("usersPage.countFound", {total, all: counts.all});
    } else if (statusScope === "active") {
        // countLabel = `Всего активных учётных записей: ${counts.active}`;
        countLabel = t("usersPage.countActive", {count: counts.active});
    } else if (statusScope === "blocked") {
        // countLabel = `Всего заблокированных учётных записей: ${counts.blocked}`;
        countLabel = t("usersPage.countBlocked", {count: counts.blocked});
    } else {
        // countLabel = `${counts.all} учётных записей`;
        countLabel = t("usersPage.countAll", {count: counts.all});
    }

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">

            <UsersPageHeader onCreateClick={() => navigate("/management/users/new")}/>

            <div className="cursor-pointer mb-4 flex gap-1 rounded-[10px] bg-[#eef2f7] p-1 w-fit">
                {/* {(["people", "Сотрудники"], ["structure", "Оргструктура"]] as const).map(([id, title]) => ( */}
                {([
                    ["people", t("usersPage.tabPeople")],
                    ["structure", t("usersPage.tabStructure")],
                ] as const).map(([id, title]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setView(id)}
                        className={`cursor-pointer rounded-[8px] px-4 py-1.5 text-[13.5px] transition
                                    ${view === id
                            ? "bg-white font-semibold text-[#101a2c] shadow-sm"
                            : "text-[#5b6b85] hover:text-[#101a2c]"}`}
                    >
                        {title}
                    </button>
                ))}
            </div>

            {view === "structure" ? <OrgStructureTree/> : <>

                <Tabs<UserStatusScope> tabs={scopeTabs} value={statusScope} onChange={setStatusScope}/>

                <UsersFilters
                    search={search}
                    onSearchChange={setSearch}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    advOpen={advOpen}
                    onToggleAdv={() => setAdvOpen((v) => !v)}
                    onCloseAdv={() => setAdvOpen(false)}
                    sourceFilters={sourceFilters}
                    onToggleSourceFilter={toggleSourceFilter}
                    onSelectAllSources={() => {
                        (["Local", "Ldap"] as UserSource[]).forEach((s) => {
                            if (!sourceFilters.includes(s)) toggleSourceFilter(s);
                        });
                    }}
                    onDeselectAllSources={() => sourceFilters.forEach((s) => toggleSourceFilter(s))}
                    viewPicker={
                        <JournalViewPicker
                            views={views.views}
                            active={views.active}
                            isDirty={views.isDirty}
                            canShare={hasPermission(PermissionCode.ManageSystemSettings)}
                            error={views.error}
                            onApply={views.apply}
                            onReset={() => views.reset(defaultColumns)}
                            onSaveNew={(name, isShared, isDefault) =>
                                void views.save({name, columns: currentColumns, isShared, isDefault})}
                            onUpdate={(v) => void views.update(v)}
                            onRemove={(v) => void views.remove(v)}
                        />
                    }
                    toggleableColumns={toggleableColumns}
                    visibleCols={visibleCols}
                    onToggleColumn={toggleColumn}
                    onSelectAllColumns={selectAllColumns}
                    onDeselectAllColumns={deselectAllColumns}
                    roles={roles}
                    positionFilters={positionFilters}
                    onPositionFiltersChange={setPositionFilters}
                    orgUnitFilters={orgUnitFilters}
                    onOrgUnitFiltersChange={setOrgUnitFilters}
                    roleFilters={roleFilters}
                    onRoleFiltersChange={setRoleFilters}
                    hasActiveFilters={hasActiveFilters}
                    onResetFilters={resetFilters}
                    countLabel={countLabel}
                />

                {loading ? (
                    // <Loader label="Загрузка пользователей…"/>
                    <Loader label={t("usersPage.loadingUsers")}/>
                ) : error ? (
                    // <EmptyState variant="error" title="Не удалось загрузить данные" description={error}/>
                    <EmptyState variant="error" title={t("usersPage.loadErrorTitle")} description={error}/>
                ) : users.length === 0 ? (
                    // <EmptyState
                    //     title="Пользователи не найдены"
                    //     description="Попробуйте изменить условия поиска или фильтры"
                    // />
                    <EmptyState
                        title={t("usersPage.emptyTitle")}
                        description={t("usersPage.emptyDescription")}
                    />
                ) : (
                    <>
                        <UsersTable
                            users={users}
                            columns={columns}
                            gridTemplate={gridTemplate}
                            onOpenProfile={(u) => navigate(`/users/${u.id}`)}
                            onEdit={(u) => navigate(`/management/users/${u.id}`)}
                            onBlock={openBlockConfirm}
                            onUnblock={openUnblockConfirm}
                        />


                        {total > pageSize && (
                            <div className="flex items-center justify-between gap-4 py-3 text-sm">
                            <span className="text-gray-500">
                                {/* {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} из {total} */}
                                {t("usersPage.paginationRange", {
                                    from: (page - 1) * pageSize + 1,
                                    to: Math.min(page * pageSize, total),
                                    total,
                                })}
                            </span>

                                <div className="flex items-center gap-2.5">
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer transition hover:bg-[#f6f8fb] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                                        disabled={page <= 1}
                                        onClick={() => setPage(page - 1)}
                                    >
                                        <ChevronLeft className="w-[15px] h-[15px]" strokeWidth={2}/>
                                        {t("usersPage.back")}
                                    </button>

                                    <span className="text-[12.5px] font-semibold text-[#8b97ab] whitespace-nowrap px-1">
                                        {t("usersPage.paginationPage", {
                                    page,
                                    totalPages: Math.ceil(total / pageSize),
                                })}
                                    </span>

                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer transition hover:bg-[#f6f8fb] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
                                        disabled={page >= Math.ceil(total / pageSize)}
                                        onClick={() => setPage(page + 1)}
                                    >
                                        {t("usersPage.forward")}
                                        <ChevronRight className="w-[15px] h-[15px]" strokeWidth={2}/>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

            </>}

            <ConfirmActionModal
                open={pendingAction !== null}
                onClose={closeActionModal}
                onConfirm={handleConfirmAction}
                loading={actionLoading}
                error={actionError}
                variant={pendingAction?.type === "block" ? "danger" : "success"}
                title={
                    // pendingAction?.type === "block"
                    //     ? "Заблокировать пользователя?"
                    //     : "Разблокировать пользователя?"
                    pendingAction?.type === "block"
                        ? t("usersPage.confirmBlockTitle")
                        : t("usersPage.confirmUnblockTitle")
                }
                message={
                    pendingAction
                        ? pendingAction.type === "block"
                            // ? `Пользователь «${pendingAction.user.fullName}» потеряет доступ к системе до разблокировки.`
                            // : `Пользователь «${pendingAction.user.fullName}» снова получит доступ к системе.`
                            ? t("usersPage.confirmBlockMessage", {name: pendingAction.user.fullName})
                            : t("usersPage.confirmUnblockMessage", {name: pendingAction.user.fullName})
                        : ""
                }
                confirmLabel={
                    // pendingAction?.type === "block" ? "Заблокировать" : "Разблокировать"
                    pendingAction?.type === "block"
                        ? t("usersPage.confirmBlockLabel")
                        : t("usersPage.confirmUnblockLabel")
                }
            />
        </div>
    );
}