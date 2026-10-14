// Выбор получателей рассылки "Новые редакции ВНД" - список сотрудников с фильтрами
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import type {UserResponse} from "@/service/userService/userServiceType.ts";
import {userService} from "@/service/userService/userService.ts";
import {toast} from "@/service/toastService.ts";
import type {
    VndNewRedactionMailingRecipient
} from "@/service/vndNewRedactionMailingService/vndNewRedactionMailingService.ts";
import {useUsersList} from "@/hooks/userHooks/useUsersList.ts";
import {HighlightText} from "@/utils/highlightText.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {UserListFilters} from "@/components/componentsGeneral/userPicker/UserListFilters.tsx";
import {Check, ChevronLeft, ChevronRight, Loader2, X} from "lucide-react";


interface NewRedactionRecipientsPickerModalProps {
    /** Уже выбранные получатели - отмечены галочками при открытии. */
    initial: VndNewRedactionMailingRecipient[];
    onClose: () => void;
    onConfirm: (recipients: VndNewRedactionMailingRecipient[]) => void;
    /** Заголовок окна (по умолчанию - про получателей рассылки о новых редакциях). */
    title?: string;
}

const toRecipient = (u: UserResponse): VndNewRedactionMailingRecipient => ({
    userId: u.id,
    fullName: u.fullName,
    email: u.email,
    orgUnitName: u.orgUnit?.titleRu ?? null,
    positionName: u.position?.titleRu ?? null,
    isInactive: !u.isActive || u.isBlocked,
});

/** Сколько записей тянуть за раз при "Выбрать всех найденных" (MaxPageSize на сервере). */
const BULK_PAGE_SIZE = 200;

export function NewRedactionRecipientsPickerModal({
                                                      initial,
                                                      onClose,
                                                      onConfirm,
                                                      title
                                                  }: NewRedactionRecipientsPickerModalProps) {
    const {t} = useTranslation();

    const usersList = useUsersList();
    const {
        search,
        setStatusScope,
        // Текущие фильтры нужны и здесь - для "Выбрать всех найденных"
        sourceFilters, orgUnitFilters, positionFilters, roleFilters,
        users, loading, error,
        page, setPage, total, pageSize,
    } = usersList;

    // Заблокированным письмо всё равно не уйдёт (MailQueue их пропускает) - показываем только
    // незаблокированных, как в остальных пикерах.
    useEffect(() => {
        setStatusScope("active");
    }, [setStatusScope]);

    const [selected, setSelected] = useState<Map<number, VndNewRedactionMailingRecipient>>(
        () => new Map(initial.map((r) => [r.userId, r])),
    );
    const [bulkLoading, setBulkLoading] = useState(false);

    const toggle = (u: UserResponse) =>
        setSelected((prev) => {
            const next = new Map(prev);
            if (next.has(u.id)) next.delete(u.id);
            else next.set(u.id, toRecipient(u));
            return next;
        });

    const allOnPageSelected = users.length > 0 && users.every((u) => selected.has(u.id));
    const togglePage = () =>
        setSelected((prev) => {
            const next = new Map(prev);
            if (allOnPageSelected) users.forEach((u) => next.delete(u.id));
            else users.forEach((u) => next.set(u.id, toRecipient(u)));
            return next;
        });

    // Все, кто подходит под текущие фильтры, — не только видимая страница.
    const selectAllFound = async () => {
        setBulkLoading(true);
        try {
            const found: UserResponse[] = [];
            for (let p = 1; ; p++) {
                const data = await userService.getPage({
                    page: p,
                    pageSize: BULK_PAGE_SIZE,
                    sortBy: "NameAsc",
                    search: search.trim() || undefined,
                    orgUnitIds: orgUnitFilters.length ? orgUnitFilters.map(Number) : undefined,
                    positionIds: positionFilters.length ? positionFilters.map(Number) : undefined,
                    roleIds: roleFilters.length ? roleFilters.map(Number) : undefined,
                    sources: sourceFilters.length ? sourceFilters : undefined,
                    isBlocked: false,
                });
                found.push(...data.items);
                if (data.items.length < BULK_PAGE_SIZE || found.length >= data.total) break;
            }
            setSelected((prev) => {
                const next = new Map(prev);
                found.forEach((u) => next.set(u.id, toRecipient(u)));
                return next;
            });
            // Добавлены все найденные / Сотрудников по фильтру: {n}
            toast.success(t("notificationMailingSettingsPage.recipientsPicker.allFoundAdded"), t("notificationMailingSettingsPage.recipientsPicker.foundByFilter", {n: found.length}));
        } catch (e) {
            // Не удалось выбрать всех
            toast.error(t("notificationMailingSettingsPage.recipientsPicker.selectAllFailed"), e instanceof Error ? e.message : "");
        } finally {
            setBulkLoading(false);
        }
    };

    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
            <div className="flex h-[86vh] w-full max-w-[720px] flex-col rounded-[16px] bg-white shadow-2xl">
                <div className="flex flex-none items-center justify-between border-b border-[#eef0f5] px-6 py-4">
                    {/* Получатели рассылки о новых редакциях */}
                    <h2 className="text-[15px] font-bold text-[#1c2740]">{title ?? t("notificationMailingSettingsPage.recipientsPicker.defaultTitle")}</h2>
                    <button onClick={onClose} className="cursor-pointer text-[#8b97ab] hover:text-[#3a4560]">
                        <X size={20}/>
                    </button>
                </div>

                {/* Фильтры - как на странице "Пользователи" */}
                <UserListFilters filters={usersList}/>

                {/* Массовые действия */}
                <div
                    className="flex flex-none flex-wrap items-center gap-2 border-b border-[#eef0f5] px-6 py-2.5 text-[12px]">
                    {/* Найдено: */}
                    <span className="text-[#8b97ab]">{t("notificationMailingSettingsPage.recipientsPicker.found")} <b className="text-[#3a4560]">{total}</b></span>
                    <button
                        type="button"
                        onClick={togglePage}
                        disabled={users.length === 0}
                        className="cursor-pointer rounded-[8px] border border-[#e5e9f0] bg-white px-2.5 py-1 font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {/* Снять на странице / Выбрать на странице */}
                        {allOnPageSelected ? t("notificationMailingSettingsPage.recipientsPicker.deselectPage") : t("notificationMailingSettingsPage.recipientsPicker.selectPage")}
                    </button>
                    <button
                        type="button"
                        onClick={() => void selectAllFound()}
                        disabled={bulkLoading || total === 0}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#d4d6f8] bg-[#f5f6fd] px-2.5 py-1 font-semibold text-[#4e57d6] hover:bg-[#ececfc] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {bulkLoading && <Loader2 size={12} className="animate-spin"/>}
                        {/* Выбрать всех найденных */}
                        {t("notificationMailingSettingsPage.recipientsPicker.selectAllFound")}
                    </button>
                    {/* Выбрано: */}
                    <span className="ml-auto text-[#8b97ab]">{t("general.selectedCount")} <b className="text-[#4e57d6]">{selected.size}</b></span>
                </div>

                {/* Список */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {loading ? (
                        <div className="flex h-full items-center justify-center text-[#8b97ab]">
                            <Loader2 size={20} className="animate-spin"/>
                        </div>
                    ) : error ? (
                        <EmptyState variant="error" title={t("tidDeveloperPickerModal.loadFailedTitle")}
                                    description={error}/>
                    ) : users.length === 0 ? (
                        <div className="flex h-full items-center justify-center text-[12.5px] text-[#8b97ab]">
                            {t("tidDeveloperPickerModal.noResults")}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0.5">
                            {users.map((u) => {
                                const checked = selected.has(u.id);
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => toggle(u)}
                                        className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-[9px] text-left transition-colors ${
                                            checked ? "bg-[#f5f6ff]" : "hover:bg-[#f6f8fb]"}`}
                                    >
                                        <span
                                            className={`grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px] ${
                                                checked ? "bg-[#4e57d6]" : "border border-[#d5dae3] bg-white"}`}>
                                            {checked && <Check size={12} strokeWidth={3} className="text-white"/>}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <HighlightText text={u.fullName} query={search}
                                                           className="block truncate text-[13px] font-semibold text-[#26324a]"/>
                                            <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                                {[u.email, u.position?.titleRu, u.orgUnit?.titleRu].filter(Boolean).join(" · ")}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex flex-none items-center justify-between gap-3 border-t border-[#eef0f5] px-6 py-3">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#8b97ab]">
                        <button
                            type="button"
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1 || loading}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] border border-[#e5e9f0] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft size={14}/>
                        </button>
                        {/* Страница {page} из {pageCount} */}
                        <span>{t("notificationMailingSettingsPage.recipientsPicker.pageOf", {page, pageCount})}</span>
                        <button
                            type="button"
                            onClick={() => setPage(Math.min(pageCount, page + 1))}
                            disabled={page >= pageCount || loading}
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-[7px] border border-[#e5e9f0] hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronRight size={14}/>
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#55617a] hover:bg-[#f6f8fb]"
                        >
                            {t("general.cancel")}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm(Array.from(selected.values()));
                                onClose();
                            }}
                            className="h-9 cursor-pointer rounded-[9px] bg-[#4e57d6] px-4 text-[13px] font-semibold text-white hover:bg-[#3f47bd]"
                        >
                            {/* Готово ({n}) */}
                            {t("notificationMailingSettingsPage.recipientsPicker.done", {n: selected.size})}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
