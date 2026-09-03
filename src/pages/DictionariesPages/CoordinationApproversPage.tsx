// Справочник обязательных (фиксированных) этапов процесса согласования ВНД -
// полноценный CRUD: название/СП/согласующий редактируемы, этапы можно добавлять,
// удалять и менять их порядок в маршруте согласования.
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus, Trash2, UserCheck} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {ConfirmDeleteModal} from "@/components/componentsGeneral/modal/ConfirmDeleteModal.tsx";
import {useCoordinationApprovers} from "@/hooks/dictionariesHooks/useCoordinationApprovers.ts";
import {CoordinationStageFormModal} from "@/components/componentsDictionaries/CoordinationStageFormModal.tsx";

export function CoordinationApproversPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageVndDictionaries);

    const {
        loading, error, items, refetch,
        formModal, submitting, formError,
        openCreate, openEdit, closeFormModal, submitForm,
        deleteTarget, deleting, deleteError, openDelete, closeDelete, confirmDelete,
        moveItem, reorderingId,
    } = useCoordinationApprovers();

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/management/refs")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {t("dictionaries.navigateVnd")}
            </button>

            <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-[9px] bg-[#eef0fd] text-[#4e57d6] grid place-items-center flex-none">
                        <UserCheck className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                    </span>
                    <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                        {t("coordinationApproversPage.title")}
                    </h1>
                </div>

                {canManage && !loading && !error && (
                    <button
                        type="button"
                        onClick={openCreate}
                        className="flex-none inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6]"
                    >
                        <Plus className="w-[15px] h-[15px]" strokeWidth={2.2}/>
                        Добавить этап
                    </button>
                )}
            </div>

            <p className="text-[12.5px] text-[#8b97ab] mb-4 leading-[1.5]">
                Все активные этапы этого справочника обязательны в маршруте согласования, в указанном порядке.
                Стрелками можно менять порядок этапов — это влияет на порядок в маршруте.
            </p>

            {loading && <Loader label={t("general.loading")}/>}

            {!loading && error && (
                <EmptyState
                    variant="error"
                    title={t("dictionaries.loadError")}
                    actionLabel={t("general.retry")}
                    onAction={refetch}
                />
            )}

            {!loading && !error && items.length === 0 && (
                <EmptyState
                    variant="empty"
                    icon={UserCheck}
                    title={t("dictionaries.empty")}
                    actionLabel={canManage ? "Добавить этап" : undefined}
                    onAction={canManage ? openCreate : undefined}
                />
            )}

            {!loading && !error && items.length > 0 && (
                <div className="bg-white border border-[#e9edf3] rounded-2xl p-2">
                    {items.map((item, index) => (
                        <div
                            key={item.id}
                            className="group flex items-center gap-3 py-[11px] px-3 rounded-lg hover:bg-[#f6f8fb]"
                        >
                            {canManage && (
                                <div className="flex-none flex flex-col items-center gap-0.5">
                                    <button
                                        type="button"
                                        disabled={index === 0 || reorderingId !== null}
                                        onClick={() => moveItem(item.id, "up")}
                                        className="w-5 h-5 grid place-items-center rounded text-[#8b97ab] cursor-pointer hover:bg-[#eef0fd] hover:text-[#4e57d6] disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronUp className="w-[13px] h-[13px]" strokeWidth={2.4}/>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === items.length - 1 || reorderingId !== null}
                                        onClick={() => moveItem(item.id, "down")}
                                        className="w-5 h-5 grid place-items-center rounded text-[#8b97ab] cursor-pointer hover:bg-[#eef0fd] hover:text-[#4e57d6] disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronDown className="w-[13px] h-[13px]" strokeWidth={2.4}/>
                                    </button>
                                </div>
                            )}

                            <span className="flex-none w-6 text-center text-[12px] font-semibold text-[#a3adbd]">
                                {item.order}
                            </span>

                            <div className="flex-1 min-w-0">
                                <div className="text-[13.5px] font-semibold text-[#1c2740]">
                                    {item.title}
                                </div>
                                <div className="text-[11.5px] text-[#a3adbd]">
                                    {item.orgUnitName}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0 text-[13px] text-[#26324a]">
                                {item.approverName ?? (
                                    <span className="text-[#a3adbd] italic">
                                        {t("coordinationApproversPage.noApprover")}
                                    </span>
                                )}
                            </div>

                            {canManage && (
                                <div className="flex-none flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip content={t("dictionaries.editAction")} side="top">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(item)}
                                            className="w-7 h-7 grid place-items-center rounded-md bg-[#ececfc] text-[#4e57d6] cursor-pointer transition-colors hover:bg-[#dcdefa] hover:text-[#3a42b8]"
                                        >
                                            <Pencil className="w-[13px] h-[13px]" strokeWidth={2}/>
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={t("dictionaries.deleteAction")} side="top">
                                        <button
                                            type="button"
                                            onClick={() => openDelete(item)}
                                            className="w-7 h-7 grid place-items-center rounded-md bg-[#fdeceb] text-[#c0392b] cursor-pointer transition-colors hover:bg-[#fad9d7] hover:text-[#a52d21]"
                                        >
                                            <Trash2 className="w-[13px] h-[13px]" strokeWidth={2}/>
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {formModal && (
                <CoordinationStageFormModal
                    open
                    onClose={closeFormModal}
                    mode={formModal.mode}
                    item={formModal.mode === "edit" ? formModal.item : null}
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
                    title="Удалить обязательный этап?"
                    message={t("dictionaries.deleteConfirmMessage", {name: deleteTarget.title})}
                />
            )}
        </div>
    );
}
