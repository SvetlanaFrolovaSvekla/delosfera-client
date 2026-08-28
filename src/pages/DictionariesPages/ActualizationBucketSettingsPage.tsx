// Страница-справочник "Пороги индикации сроков актуализации" (раздел ВНД)
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";
import {ArrowLeft} from "lucide-react";

import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {ACTUALIZATION_BUCKET_STYLE} from "@/hooks/actualizationHooks/useActualizationBucketMeta.ts";
import {
    actualizationBucketSettingsService,
    type ActualizationBucketSettings,
} from "@/service/actualizationBucketSettingsService/actualizationBucketSettingsService.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";

const MAX_DAYS = 3650; // 10 лет — разумный потолок, чтобы не завести опечатку в поле

export function ActualizationBucketSettingsPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canManage = hasPermission(PermissionCode.ManageVndDictionaries);

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    // Значения полей ввода держим строками: иначе при стирании поля пользователем
    // (пустая строка на пути к новому числу) значение тут же схлопывалось бы в 0.
    const [criticalInput, setCriticalInput] = useState("");
    const [approachingInput, setApproachingInput] = useState("");
    const [savedSettings, setSavedSettings] = useState<ActualizationBucketSettings | null>(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const applyLoaded = (s: ActualizationBucketSettings) => {
        setSavedSettings(s);
        setCriticalInput(String(s.criticalDays));
        setApproachingInput(String(s.approachingDays));
    };

    const load = () => {
        setLoading(true);
        setLoadError(false);
        actualizationBucketSettingsService.get()
            .then(applyLoaded)
            .catch(() => setLoadError(true))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        load();
    }, []);

    // ── Валидация ────────────────────────────────────────────────────────────
    const parsedCritical = useMemo(() => parseDays(criticalInput), [criticalInput]);
    const parsedApproaching = useMemo(() => parseDays(approachingInput), [approachingInput]);

    const criticalError = useMemo(() => {
        if (parsedCritical === null) return t("actualizationBucketSettingsPage.errorInvalid");
        if (parsedCritical < 0 || parsedCritical > MAX_DAYS)
            return t("actualizationBucketSettingsPage.errorRange", {max: MAX_DAYS});
        return null;
    }, [parsedCritical, t]);

    const approachingError = useMemo(() => {
        if (parsedApproaching === null) return t("actualizationBucketSettingsPage.errorInvalid");
        if (parsedApproaching < 0 || parsedApproaching > MAX_DAYS)
            return t("actualizationBucketSettingsPage.errorRange", {max: MAX_DAYS});
        if (
            criticalError === null && parsedCritical !== null &&
            parsedApproaching <= parsedCritical
        )
            return t("actualizationBucketSettingsPage.errorMustExceedCritical");
        return null;
    }, [parsedApproaching, parsedCritical, criticalError, t]);

    const isValid = criticalError === null && approachingError === null
        && parsedCritical !== null && parsedApproaching !== null;

    const isDirty = savedSettings !== null && isValid &&
        (parsedCritical !== savedSettings.criticalDays || parsedApproaching !== savedSettings.approachingDays);

    const save = async () => {
        if (!isValid || parsedCritical === null || parsedApproaching === null) return;

        setSaving(true);
        setSaveError(null);
        setSaved(false);
        try {
            const result = await actualizationBucketSettingsService.update({
                criticalDays: parsedCritical,
                approachingDays: parsedApproaching,
            });
            applyLoaded(result);
            setSaved(true);
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}}).response?.data?.message;
            setSaveError(message ?? t("actualizationBucketSettingsPage.saveError"));
        } finally {
            setSaving(false);
        }
    };

    const normalStyle = ACTUALIZATION_BUCKET_STYLE.normal;
    const approachingStyle = ACTUALIZATION_BUCKET_STYLE.approaching;
    const criticalStyle = ACTUALIZATION_BUCKET_STYLE.critical;
    const overdueStyle = ACTUALIZATION_BUCKET_STYLE.overdue;

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
                <span
                    className="w-8 h-8 rounded-[9px] grid place-items-center flex-none"
                    style={{background: approachingStyle.bg, color: approachingStyle.color}}
                >
                    <approachingStyle.icon className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                </span>
                <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                    {t("actualizationBucketSettingsPage.title")}
                </h1>
            </div>
            <p className="mt-[10px] mb-5 text-[13px] text-[#8b97ab] leading-[1.5]">
                {t("actualizationBucketSettingsPage.subtitle")}
            </p>

            {loading && <Loader label={t("general.loading")}/>}

            {!loading && loadError && (
                <EmptyState
                    variant="error"
                    title={t("dictionaries.loadError")}
                    actionLabel={t("actualizationBucketSettingsPage.retry")}
                    onAction={load}
                />
            )}

            {!loading && !loadError && savedSettings && (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
                        {/* В норме — считается автоматически, полей ввода нет */}
                        <div
                            className="bg-white border-[1.5px] rounded-2xl px-[17px] py-[15px]"
                            style={{borderColor: "#e9edf3"}}
                        >
                            <div className="flex items-center gap-2.5 mb-2">
                                <span
                                    className="w-7 h-7 rounded-lg grid place-items-center flex-none"
                                    style={{background: normalStyle.bg, color: normalStyle.color}}
                                >
                                    <normalStyle.icon className="w-[15px] h-[15px]" strokeWidth={2}/>
                                </span>
                                <span className="text-[12.5px] font-bold text-[#55617a]">
                                    {t("vnd.actualizationBuckets.normal")}
                                </span>
                            </div>
                            <div className="text-[13px] text-[#1c2740] leading-[1.4]">
                                {approachingError === null && parsedApproaching !== null
                                    ? t("actualizationBucketSettingsPage.normalValue", {days: parsedApproaching})
                                    : "—"}
                            </div>
                        </div>

                        {/* Приближается — редактируемый порог */}
                        <ThresholdCard
                            style={approachingStyle}
                            label={t("vnd.actualizationBuckets.approaching")}
                            value={approachingInput}
                            onChange={setApproachingInput}
                            disabled={!canManage}
                            error={approachingError}
                            suffix={t("vnd.daysUnit")}
                        />

                        {/* Критично — редактируемый порог */}
                        <ThresholdCard
                            style={criticalStyle}
                            label={t("vnd.actualizationBuckets.critical")}
                            value={criticalInput}
                            onChange={setCriticalInput}
                            disabled={!canManage}
                            error={criticalError}
                            suffix={t("vnd.daysUnit")}
                        />

                        {/* Просрочено — не настраивается */}
                        <div
                            className="bg-white border-[1.5px] rounded-2xl px-[17px] py-[15px]"
                            style={{borderColor: "#e9edf3"}}
                        >
                            <div className="flex items-center gap-2.5 mb-2">
                                <span
                                    className="w-7 h-7 rounded-lg grid place-items-center flex-none"
                                    style={{background: overdueStyle.bg, color: overdueStyle.color}}
                                >
                                    <overdueStyle.icon className="w-[15px] h-[15px]" strokeWidth={2}/>
                                </span>
                                <span className="text-[12.5px] font-bold text-[#55617a]">
                                    {t("vnd.actualizationBuckets.overdue")}
                                </span>
                            </div>
                            <div className="text-[13px] text-[#1c2740] leading-[1.4]">
                                {t("actualizationBucketSettingsPage.overdueValue")}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-[#e9edf3] rounded-2xl p-5 sm:p-6">
                        <p className="m-0 text-[12px] text-[#8b97ab] leading-[1.6]">
                            {t("actualizationBucketSettingsPage.overdueHint")}
                        </p>

                        {saveError && (
                            <div className="mt-4 text-[12.5px] text-[#e0483d]">{saveError}</div>
                        )}

                        {canManage && (
                            <div className="mt-5 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={save}
                                    disabled={saving || !isValid || !isDirty}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_6px_16px_-6px_#4e57d6]"
                                >
                                    {saving ? t("general.saving") : t("general.save")}
                                </button>
                                {saved && !saving && !isDirty && (
                                    <span className="text-[12.5px] text-[#1f8a4c]">
                                        {t("actualizationBucketSettingsPage.saved")}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function parseDays(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === "" || !/^\d+$/.test(trimmed)) return null;
    return Number(trimmed);
}

function ThresholdCard({style, label, value, onChange, disabled, error, suffix}: {
    style: {color: string; bg: string; icon: typeof ArrowLeft};
    label: string;
    value: string;
    onChange: (v: string) => void;
    disabled: boolean;
    error: string | null;
    suffix: string;
}) {
    const Icon = style.icon;
    return (
        <div
            className="bg-white border-[1.5px] rounded-2xl px-[17px] py-[15px]"
            style={{borderColor: error ? "#e0483d" : "#e9edf3"}}
        >
            <div className="flex items-center gap-2.5 mb-2">
                <span
                    className="w-7 h-7 rounded-lg grid place-items-center flex-none"
                    style={{background: style.bg, color: style.color}}
                >
                    <Icon className="w-[15px] h-[15px]" strokeWidth={2}/>
                </span>
                <span className="text-[12.5px] font-bold text-[#55617a]">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    min={0}
                    max={MAX_DAYS}
                    step={1}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-[76px] h-9 px-2.5 rounded-[8px] border border-[#e5e9f0] text-[15px] font-bold text-[#1c2740] outline-none focus:border-[#4e57d6] disabled:bg-[#fafbfc] disabled:text-[#8b97ab]"
                />
                <span className="text-[12px] text-[#a3adbd]">{suffix}</span>
            </div>
            {error && <div className="mt-1.5 text-[11.5px] text-[#e0483d]">{error}</div>}
        </div>
    );
}
