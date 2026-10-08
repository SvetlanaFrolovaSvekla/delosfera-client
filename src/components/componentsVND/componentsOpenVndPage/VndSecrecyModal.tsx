// Модалка «Настройки секретности» (три точки → «Настройки секретности», право ManageVndSecrecy).
// Секретный документ остаётся в реестре с замочком, но открыть его, файлы, историю и согласование
// могут только администратор/главный редактор, выбранные группы пользователей и отдельные сотрудники.
import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {useTranslation} from "react-i18next";
import {Lock, LockOpen, Plus, ShieldCheck, Trash2, UserX, Users, X} from "lucide-react";

import {useDictionaries} from "@/context/DictionariesContext.tsx";
import {toast} from "@/service/toastService.ts";
import {vndSecrecyService, type VndSecrecyUser} from "@/service/vndSecrecyService/vndSecrecyService.ts";
import type {VndNewRedactionMailingRecipient} from "@/service/vndNewRedactionMailingService/vndNewRedactionMailingService.ts";
import {MultiSelectField} from "@/components/componentsGeneral/selects/MultiSelects/MultiSelectField.tsx";
import {NewRedactionRecipientsPickerModal} from "@/components/componentsVND/componentsNotificationSettings/NewRedactionRecipientsPickerModal.tsx";
import {Loader} from "@/components/componentsGeneral/Loader";

interface VndSecrecyModalProps {
    vndId: number;
    vndCode: string;
    onClose: () => void;
    /** Настройки сохранены — обновить карточку (замочек в шапке). */
    onSaved: () => void;
}

const toRecipient = (u: VndSecrecyUser): VndNewRedactionMailingRecipient => ({...u});

export function VndSecrecyModal({vndId, vndCode, onClose, onSaved}: VndSecrecyModalProps) {
    const {t} = useTranslation();
    const dictionaries = useDictionaries();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isSecret, setIsSecret] = useState(false);
    const [groupKeys, setGroupKeys] = useState<string[]>([]);
    const [users, setUsers] = useState<VndSecrecyUser[]>([]);
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        vndSecrecyService.get(vndId)
            .then((s) => {
                setIsSecret(s.isSecret);
                setGroupKeys(s.groupIds.map(String));
                setUsers(s.users);
            })
            .catch((e) => setLoadError(e instanceof Error ? e.message : t("vndSecrecyModal.loadError")))
            .finally(() => setLoading(false));
    }, [vndId, t]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await vndSecrecyService.update(vndId, {
                isSecret,
                groupIds: groupKeys.map(Number),
                userIds: users.map((u) => u.userId),
            });
            toast.success(
                t(isSecret ? "vndSecrecyModal.savedSecretToast" : "vndSecrecyModal.savedOpenToast"),
                vndCode,
            );
            onSaved();
            onClose();
        } catch (e) {
            setError(e instanceof Error ? e.message : t("vndSecrecyModal.saveError"));
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0f1b2d]/40 p-4 backdrop-blur-[2px]">
            <div className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_70px_-20px_rgba(15,27,45,.35)]">
                <div className="flex flex-none items-center justify-between gap-3 border-b border-[#eef0f5] px-7 py-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 flex-none place-items-center rounded-[11px] bg-[#ececfc] text-[#4e57d6]">
                            {isSecret ? <Lock size={19} strokeWidth={1.9}/> : <LockOpen size={19} strokeWidth={1.9}/>}
                        </span>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-bold text-[#1c2740]">{t("vndSecrecyModal.title")}</h2>
                            <div className="mt-[2px] truncate font-mono text-[11.5px] font-semibold text-[#8b97ab]">{vndCode}</div>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={saving}
                            className="cursor-pointer flex-none text-[#8b97ab] hover:text-[#3a4560] disabled:opacity-50">
                        <X size={20}/>
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-7 py-5">
                    {loading ? (
                        <Loader label={t("general.loading")} fullHeight={false}/>
                    ) : loadError ? (
                        <div className="rounded-[10px] bg-[#fdeceb] px-4 py-3 text-[12.5px] text-[#c0392b]">{loadError}</div>
                    ) : (
                        <div className="space-y-5">
                            {/* Переключатель */}
                            <label className={`flex cursor-pointer items-start gap-3.5 rounded-[12px] border px-4 py-3.5 transition-colors ${
                                isSecret ? "border-[#d4d6f8] bg-[#f5f6fd]" : "border-[#e5e9f0] bg-white hover:bg-[#f8fafc]"}`}>
                                <input
                                    type="checkbox"
                                    checked={isSecret}
                                    disabled={saving}
                                    onChange={(e) => setIsSecret(e.target.checked)}
                                    className="mt-[3px] h-[16px] w-[16px] flex-none cursor-pointer accent-[#4e57d6]"
                                />
                                <span>
                                    <span className="block text-[13.5px] font-bold text-[#1c2740]">{t("vndSecrecyModal.toggleLabel")}</span>
                                    <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-[#6b7791]">{t("vndSecrecyModal.toggleHint")}</span>
                                </span>
                            </label>

                            {isSecret && (
                                <>
                                    <div className="flex items-start gap-2.5 rounded-[12px] border border-[#cfe9dc] bg-[#f1faf5] px-4 py-3 text-[12.5px] leading-[1.5] text-[#2f6b4f]">
                                        <ShieldCheck size={15} className="mt-[2px] flex-none text-[#1a8a5f]" strokeWidth={2}/>
                                        <span>{t("vndSecrecyModal.alwaysAccess")}</span>
                                    </div>

                                    {/* Группы пользователей */}
                                    <div>
                                        <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[#8b97ab]">
                                            <Users size={13}/> {t("vndSecrecyModal.groupsTitle")}
                                        </div>
                                        <MultiSelectField
                                            label={t("vndSecrecyModal.groupsLabel")}
                                            modalTitle={t("vndSecrecyModal.groupsModalTitle")}
                                            options={dictionaries.userGroupOptions}
                                            selectedKeys={groupKeys}
                                            onChange={setGroupKeys}
                                            searchPlaceholder={t("vndSecrecyModal.groupsSearch")}
                                            boldLabel={false}
                                        />
                                        <p className="mt-1.5 text-[11.5px] leading-[1.4] text-[#8b97ab]">{t("vndSecrecyModal.groupsHint")}</p>
                                    </div>

                                    {/* Отдельные пользователи */}
                                    <div>
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="text-[12px] font-bold uppercase tracking-wide text-[#8b97ab]">
                                                {t("vndSecrecyModal.usersTitle", {count: users.length})}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setPickerOpen(true)}
                                                disabled={saving}
                                                className="ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#d4d6f8] bg-[#f5f6fd] px-3 text-[12.5px] font-semibold text-[#4e57d6] hover:bg-[#ececfc] disabled:opacity-50"
                                            >
                                                <Plus size={14}/> {t("vndSecrecyModal.addUsers")}
                                            </button>
                                        </div>
                                        <div className="max-h-[260px] overflow-y-auto rounded-xl border border-[#eef2f7]">
                                            {users.length === 0 ? (
                                                <div className="px-4 py-5 text-center text-[12.5px] text-[#8b97ab]">
                                                    {t("vndSecrecyModal.noUsers")}
                                                </div>
                                            ) : (
                                                users.map((u) => (
                                                    <div key={u.userId}
                                                         className="flex items-center gap-3 border-b border-[#f2f5f9] px-3.5 py-2 last:border-b-0 hover:bg-[#fafbfd]">
                                                        <span className="min-w-0 flex-1">
                                                            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#26324a]">
                                                                <span className="truncate">{u.fullName}</span>
                                                                {u.isInactive && (
                                                                    <span title={t("vndSecrecyModal.inactiveHint")}
                                                                          className="inline-flex flex-none items-center gap-1 rounded-full bg-[#fdf1f1] px-2 py-[1px] text-[10px] font-medium text-[#c0392b]">
                                                                        <UserX size={10}/> {t("vndSecrecyModal.inactive")}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span className="block truncate text-[11.5px] text-[#8b97ab]">
                                                                {[u.email, u.positionName, u.orgUnitName].filter(Boolean).join(" · ")}
                                                            </span>
                                                        </span>
                                                        <button
                                                            type="button"
                                                            disabled={saving}
                                                            onClick={() => setUsers((prev) => prev.filter((x) => x.userId !== u.userId))}
                                                            title={t("vndSecrecyModal.removeUser")}
                                                            className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-[7px] text-[#c3ccd8] hover:bg-[#fdeceb] hover:text-[#c0392b]"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-[12px] border border-[#f0dcae] bg-[#fffaf0] px-4 py-3 text-[12.5px] leading-[1.5] text-[#6b5a2e]">
                                        {t("vndSecrecyModal.warnParticipants")}
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="rounded-[9px] bg-[#fdeceb] px-3 py-2 text-center text-[12.5px] text-[#c0392b]">{error}</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-none items-center justify-end gap-2.5 border-t border-[#eef0f5] px-7 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="h-9 cursor-pointer rounded-[9px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#55617a] hover:bg-[#f6f8fb] disabled:opacity-60"
                    >
                        {t("general.cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSave()}
                        disabled={saving || loading || loadError !== null}
                        className="h-9 cursor-pointer rounded-[9px] bg-[#4e57d6] px-5 text-[13px] font-semibold text-white hover:bg-[#3f47bd] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? t("vndSecrecyModal.saving") : t("vndSecrecyModal.save")}
                    </button>
                </div>
            </div>

            {pickerOpen && (
                <NewRedactionRecipientsPickerModal
                    title={t("vndSecrecyModal.pickerTitle")}
                    initial={users.map(toRecipient)}
                    onClose={() => setPickerOpen(false)}
                    onConfirm={(next) => setUsers(next.map((r) => ({...r})))}
                />
            )}
        </div>,
        document.body,
    );
}
