/**
 * Маршрутизация кадровых СЗ (КСЗ-04..06, КСЗ-12): кто кадровик УЧР по областям.
 * Автор из филиальной сети → УЧР по филиалам, иначе → УЧР по Головному офису.
 * Эти люди подставляются в маршрут ролью «Кадровик УЧР» автоматически.
 */
import React, {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {hrRoutingService} from "@/service/szService/hrRoutingService.ts";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

export function HrRoutingSettingsPage() {
    const {t} = useTranslation();
    const [users, setUsers] = useState<UserLookupItem[]>([]);
    const [headOffice, setHeadOffice] = useState<number | null>(null);
    const [branch, setBranch] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([userService.lookup(), hrRoutingService.get()])
            .then(([list, s]) => {
                setUsers(list);
                setHeadOffice(s.headOfficeHrUserId);
                setBranch(s.branchHrUserId);
            })
            .catch(() => setError(t("hrRoutingSettings.errorLoad") /* Не удалось загрузить настройки */))
            .finally(() => setLoading(false));
    }, [t]);

    async function save() {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            await hrRoutingService.set({headOfficeHrUserId: headOffice, branchHrUserId: branch});
            setSaved(true);
        } catch {
            setError(t("hrRoutingSettings.errorSave") /* Не удалось сохранить */);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("hrRoutingSettings.pageTitle") /* Маршрутизация кадровых СЗ */}
                description={t("hrRoutingSettings.pageDescription") /* Кто выступает кадровиком УЧР в маршруте кадровых записок — по области автора. Автор из филиальной сети направляется на УЧР по филиалам, иначе — на УЧР по Головному офису. */}
            />

            {error && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex flex-col gap-4 p-[22px_26px] max-w-[1080px]">
                    <Loader label={t("general.loading")}/>
                </div>
            ) : (
                <div className="mt-5 flex flex-col gap-5">
                    <Field
                        label={t("hrRoutingSettings.headOfficeLabel") /* Кадровик УЧР по Головному офису */}
                        hint={t("hrRoutingSettings.headOfficeHint") /* Согласует и исполняет кадровые СЗ авторов Головного офиса. */}>
                        <UserPickerField
                            people={users}
                            value={headOffice}
                            clearable
                            placeholder={t("hrRoutingSettings.pickerPlaceholder") /* Найти по фамилии, должности или подразделению */}
                            modalTitle={t("hrRoutingSettings.headOfficeLabel") /* Кадровик УЧР по Головному офису */}
                            searchPlaceholder={t("selectApproverModal.searchPlaceholder")}
                            onChange={(id) => { setHeadOffice(id); setSaved(false); }}
                            onClear={() => { setHeadOffice(null); setSaved(false); }}
                        />
                    </Field>

                    <Field
                        label={t("hrRoutingSettings.branchLabel") /* Кадровик УЧР по филиальной сети */}
                        hint={t("hrRoutingSettings.branchHint") /* Согласует и исполняет кадровые СЗ авторов из филиалов. */}>
                        <UserPickerField
                            people={users}
                            value={branch}
                            clearable
                            placeholder={t("hrRoutingSettings.pickerPlaceholder") /* Найти по фамилии, должности или подразделению */}
                            modalTitle={t("hrRoutingSettings.branchLabel") /* Кадровик УЧР по филиальной сети */}
                            searchPlaceholder={t("selectApproverModal.searchPlaceholder")}
                            onChange={(id) => { setBranch(id); setSaved(false); }}
                            onClear={() => { setBranch(null); setSaved(false); }}
                        />
                    </Field>

                    {/* Кнопка — направо: рядом со статусом сохранения её иначе искали
                        взглядом слева, где ничего, кроме полей выбора, не было. */}
                    <div className="flex items-center justify-end gap-3">
                        {saved && <span className="text-[13px] text-[#1c7a4d]">{t("hrRoutingSettings.saved") /* Сохранено */}</span>}
                        <button
                            type="button"
                            onClick={() => void save()}
                            disabled={saving}
                            className="h-10 px-5 rounded-[10px] bg-[#2f68f5] text-white text-[14px] font-semibold cursor-pointer hover:bg-[#2554cc] disabled:opacity-50"
                        >
                            {saving ? t("hrRoutingSettings.saving") /* Сохраняем… */ : t("hrRoutingSettings.save") /* Сохранить */}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({label, hint, children}: {label: string; hint: string; children: React.ReactNode}) {
    return (
        <div className="rounded-[13px] border border-[#e5e9f0] bg-white p-4">
            <div className="text-[14px] font-semibold text-[#0f1b2d]">{label}</div>
            <div className="mt-0.5 mb-3 text-[12px] text-[#8b97ab]">{hint}</div>
            {children}
        </div>
    );
}
