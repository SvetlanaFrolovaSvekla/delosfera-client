import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ArrowLeft, Plus, Users} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {useUserGroupList} from "@/hooks/dictionariesHooks/useUserGroupList.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {UserGroupFormModal} from "@/components/componentsDictionaries/UserGroupFormModal.tsx";
import {UserGroupRow} from "@/components/componentsDictionaries/UserGroupRow.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

export function UserGroupPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageVndDictionaries);

    const {
        loading, error, filteredItems, isSearching, search, setSearch, refetch,
        formModal, formInitialValues, submitting, formError,
        openCreate, openEdit, closeFormModal, submitForm,
        deleteTarget, deleting, deleteError, openDelete, closeDelete, confirmDelete,
    } = useUserGroupList();

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/management/refs")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {t("dictionaries.navigateGeneral")}
            </button>

            <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                    <div className="flex items-center gap-2.5 mb-1">
                        <span className="w-8 h-8 rounded-[9px] bg-[#eef0fd] text-[#4e57d6] grid place-items-center flex-none">
                            <Users className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                        </span>
                        <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                            {t("userGroupPage.title")}
                        </h1>
                    </div>
                </div>

                {canManage && !loading && !error && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex-none inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[15px] h-[15px]" strokeWidth={2.2}/>
                        {t("dictionaries.addRoot")}
                    </button>
                )}
            </div>

            {!loading && !error && (
                <div className="mb-4">
                    <SearchBar
                        variant="gray"
                        value={search}
                        onChange={setSearch}
                        placeholder={t("userGroupPage.searchPlaceholder")}
                    />
                </div>
            )}

            {loading && <Loader label={t("general.loading")}/>}

            {!loading && error && (
                <EmptyState
                    variant="error"
                    title={t("dictionaries.loadError")}
                    actionLabel={t("general.retry")}
                    onAction={refetch}
                />
            )}

            {!loading && !error && filteredItems.length === 0 && (
                <EmptyState
                    variant="empty"
                    icon={Users}
                    title={isSearching ? t("general.notFound") : t("dictionaries.empty")}
                    actionLabel={!isSearching && canManage ? t("userGroupPage.emptyAction") : undefined}
                    onAction={!isSearching && canManage ? openCreate : undefined}
                />
            )}

            {!loading && !error && filteredItems.length > 0 && (
                <div className="bg-white border border-[#e9edf3] rounded-2xl p-2">
                    {filteredItems.map((item) => (
                        <UserGroupRow
                            key={item.id}
                            item={item}
                            query={search}
                            canManage={canManage}
                            onEdit={openEdit}
                            onDelete={openDelete}
                        />
                    ))}
                </div>
            )}

            {formModal && (
                <UserGroupFormModal
                    open
                    onClose={closeFormModal}
                    mode={formModal.mode}
                    initialValues={formInitialValues}
                    submitting={submitting}
                    error={formError}
                    onSubmit={submitForm}
                />
            )}

            {deleteTarget && (
                <ConfirmDeleteModal
                    open
                    onClose={closeDelete}
                    onConfirm={confirmDelete}
                    loading={deleting}
                    error={deleteError}
                    title={t("userGroupPage.deleteConfirmTitle")}
                    message={t("dictionaries.deleteConfirmMessage", {name: deleteTarget.titleRu})}
                />
            )}
        </div>
    );
}