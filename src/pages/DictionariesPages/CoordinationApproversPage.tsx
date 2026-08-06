// Справочник обязательных участников процесса согласования ВНД -
// 4 фиксированных этапа, редактируется только согласующий по умолчанию
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ArrowLeft, Pencil, UserCheck} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions.ts";

import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {useCoordinationApprovers} from "@/hooks/dictionariesHooks/useCoordinationApprovers.ts";
import {CoordinationApproverEditModal} from "@/components/componentsDictionaries/CoordinationApproverEditModal.tsx";

export function CoordinationApproversPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageVndDictionaries);

    const {
        loading, error, items, refetch,
        editTarget, submitting, formError,
        openEdit, closeEdit, submitEdit,
    } = useCoordinationApprovers();

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/refs")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {/* Справочники · ВНД */}
                {t("dictionaries.navigateVnd")}
            </button>

            <div className="flex items-center gap-2.5 mb-4">
                <span className="w-8 h-8 rounded-[9px] bg-[#eef0fd] text-[#4e57d6] grid place-items-center flex-none">
                    <UserCheck className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                </span>
                <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                    {t("coordinationApproversPage.title")}
                </h1>
            </div>

            <p className="text-[12.5px] text-[#8b97ab] mb-4 leading-[1.5]">
                {/* Пояснение: набор этапов фиксирован, менять можно только согласующего */}
                {t("coordinationApproversPage.description")}
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

            {!loading && !error && (
                <div className="bg-white border border-[#e9edf3] rounded-2xl p-2">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="group flex items-center gap-3 py-[11px] px-3 rounded-lg hover:bg-[#f6f8fb]"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-[13.5px] font-semibold text-[#1c2740]">
                                    {item.kindTitle}
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
                                <div className="flex-none opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip content={t("dictionaries.editAction")} side="top">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(item)}
                                            className="w-7 h-7 grid place-items-center rounded-md bg-[#ececfc] text-[#4e57d6] cursor-pointer transition-colors hover:bg-[#dcdefa] hover:text-[#3a42b8]"
                                        >
                                            <Pencil className="w-[13px] h-[13px]" strokeWidth={2}/>
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {editTarget && (
                <CoordinationApproverEditModal
                    open
                    onClose={closeEdit}
                    item={editTarget}
                    submitting={submitting}
                    error={formError}
                    onSubmit={submitEdit}
                />
            )}
        </div>
    );
}