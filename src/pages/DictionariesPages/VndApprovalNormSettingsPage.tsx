// Страница-справочник "Нормативы согласования по умолчанию" (раздел ВНД).
// Задаёт сроки этапов маршрута согласования редакции, которыми предзаполняется
// модалка запуска согласования (VndStartApprovalModal → useApprovalNorms).
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {ArrowDown, ArrowLeft, Timer} from "lucide-react";

import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {
    DEFAULT_FINAL_HOLD_MINUTES,
    DEFAULT_PRIMARY_MINUTES,
    DEFAULT_REPEAT_MINUTES,
    MAX_DEADLINE_MINUTES,
} from "@/constants/coordinationParams.ts";
import {
    vndApprovalNormSettingsService,
    type VndApprovalNormSettings,
} from "@/service/vndApprovalNormSettingsService/vndApprovalNormSettingsService.ts";
import {NormBlock} from "@/components/componentsCoordination/CoordinationRouteConstructor/functionalComponents/NormBlock.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

const inRange = (value: number | "") => Number(value) > 0 && Number(value) <= MAX_DEADLINE_MINUTES;

export function VndApprovalNormSettingsPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageVndDictionaries);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [primary, setPrimary] = useState<number | "">("");
    const [repeat, setRepeat] = useState<number | "">("");
    const [finalHold, setFinalHold] = useState<number | "">("");
    const [savedSettings, setSavedSettings] = useState<VndApprovalNormSettings | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const applyLoaded = (s: VndApprovalNormSettings) => {
        setSavedSettings(s);
        setPrimary(s.primaryDeadlineMinutes);
        setRepeat(s.repeatDeadlineMinutes);
        setFinalHold(s.finalHoldDeadlineMinutes);
    };

    const load = () => {
        setLoading(true);
        setLoadError(false);
        vndApprovalNormSettingsService.get()
            .then(applyLoaded)
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    const isValid = inRange(primary) && inRange(repeat) && inRange(finalHold);

    const isDirty = savedSettings !== null && (
        primary !== savedSettings.primaryDeadlineMinutes ||
        repeat !== savedSettings.repeatDeadlineMinutes ||
        finalHold !== savedSettings.finalHoldDeadlineMinutes
    );

    const isFactoryDefaults =
        primary === DEFAULT_PRIMARY_MINUTES &&
        repeat === DEFAULT_REPEAT_MINUTES &&
        finalHold === DEFAULT_FINAL_HOLD_MINUTES;

    const resetToFactoryDefaults = () => {
        setPrimary(DEFAULT_PRIMARY_MINUTES);
        setRepeat(DEFAULT_REPEAT_MINUTES);
        setFinalHold(DEFAULT_FINAL_HOLD_MINUTES);
        setSaved(false);
    };

    const change = (setter: (v: number | "") => void) => (v: number | "") => {
        setter(v);
        setSaved(false);
    };

    const save = async () => {
        if (!isValid) return;

        setSaving(true);
        setSaveError(null);
        setSaved(false);
        try {
            const result = await vndApprovalNormSettingsService.update({
                primaryDeadlineMinutes: Number(primary),
                repeatDeadlineMinutes: Number(repeat),
                finalHoldDeadlineMinutes: Number(finalHold),
            });
            applyLoaded(result);
            setSaved(true);
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setSaveError(message ?? t("vndApprovalNormSettingsPage.saveError"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/management/refs")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {t("dictionaries.navigateVnd")}
            </button>

            <div className="flex items-center gap-2.5 mb-1 mt-2">
                <span className="w-8 h-8 rounded-[9px] grid place-items-center flex-none bg-[#eef0fd] text-[#4e57d6]">
                    <Timer className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                </span>
                <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                    {t("vndApprovalNormSettingsPage.title")}
                </h1>
            </div>
            <p className="mt-[10px] mb-5 text-[13px] text-[#8b97ab] leading-[1.5]">
                {t("vndApprovalNormSettingsPage.subtitle")}
            </p>

            {loading && <Loader label={t("general.loading")}/>}

            {!loading && loadError && (
                <EmptyState
                    variant="error"
                    title={t("dictionaries.loadError")}
                    actionLabel={t("vndApprovalNormSettingsPage.retry")}
                    onAction={load}
                />
            )}

            {!loading && !loadError && savedSettings && (
                <div className="bg-white border border-[#e9edf3] rounded-2xl p-5 sm:p-6">
                    <div className="flex flex-col items-center gap-4">
                        <NormBlock
                            // Первичное согласование
                            label={t("vndStartApprovalModal.primaryApprovalLabel")}
                            value={primary}
                            onChange={change(setPrimary)}
                            helpText={t("vndStartApprovalModal.primaryApprovalHelp")}
                            disabled={!canManage}
                        />
                        <ArrowDown size={16} className="flex-none text-[#c3c9d4]"/>
                        <NormBlock
                            // Согласование после внесённых изменений
                            label={t("vndStartApprovalModal.repeatApprovalLabel")}
                            value={repeat}
                            onChange={change(setRepeat)}
                            helpText={t("vndStartApprovalModal.repeatApprovalHelp")}
                            disabled={!canManage}
                        />
                        <ArrowDown size={16} className="flex-none text-[#c3c9d4]"/>
                        <NormBlock
                            // Финальная выдержка
                            label={t("vndStartApprovalModal.finalHoldLabel")}
                            value={finalHold}
                            onChange={change(setFinalHold)}
                            helpText={t("vndStartApprovalModal.finalHoldHelp")}
                            disabled={!canManage}
                        />
                    </div>

                    <p className="mt-6 mb-0 text-[12px] text-[#8b97ab] leading-[1.6]">
                        {t("vndApprovalNormSettingsPage.hint")}
                    </p>

                    {!isValid && (
                        <div className="mt-4 text-[12.5px] text-[#e0483d]">
                            {t("vndApprovalNormSettingsPage.errorRange")}
                        </div>
                    )}

                    {saveError && (
                        <div className="mt-4 text-[12.5px] text-[#e0483d]">{saveError}</div>
                    )}

                    {canManage && (
                        <div className="mt-5 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={save}
                                disabled={saving || !isValid || !isDirty}
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_6px_16px_-6px_#4e57d6]"
                            >
                                {saving ? t("general.saving") : t("general.save")}
                            </button>
                            <button
                                type="button"
                                onClick={resetToFactoryDefaults}
                                disabled={saving || isFactoryDefaults}
                                className="inline-flex items-center h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:border-[#4e57d6] hover:text-[#4e57d6] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {t("vndApprovalNormSettingsPage.resetDefaults")}
                            </button>
                            {saved && !saving && !isDirty && (
                                <span className="text-[12.5px] text-[#1f8a4c]">
                                    {t("vndApprovalNormSettingsPage.saved")}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
