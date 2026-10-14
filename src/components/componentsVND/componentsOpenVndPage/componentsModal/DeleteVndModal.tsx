// Модалка удаления ВНД (состояние и запросы - в useVndDeleteFlow)
import type {KeyboardEvent} from "react";
import {useTranslation} from "react-i18next";
import {AlertTriangle, CheckCircle2, EyeOff, RotateCcw, Trash2} from "lucide-react";
import {ConfirmActionModal} from "@/components/componentsGeneral/modal/ConfirmActionModal.tsx";
import type {VndDeleteFlow} from "@/hooks/vndHooks/useVndDeleteFlow.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";

const INPUT_CLASS = "h-10 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] text-[#1c2740] outline-none transition-colors focus:border-[#c0392b] disabled:opacity-60";

export function DeleteVndModal({flow, vnd}: { flow: VndDeleteFlow; vnd: VndResponse }) {
    const {t} = useTranslation();
    const isDraft = vnd.status === "draft";
    const {step, deleting} = flow;
    const submitOnEnter = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !deleting) void flow.submit();
    };

    return (
        <ConfirmActionModal
            open={flow.open}
            onClose={flow.close}
            onConfirm={flow.submit}
            title={step === 1
                ? t("openVndPage.deleteStep2Title")
                : t(isDraft ? "openVndPage.deleteConfirmTitle" : "openVndPage.deleteAnyConfirmTitle")}
            message={step === 1
                ? t("openVndPage.deleteStep2Message", {name: vnd.name})
                : t(isDraft ? "openVndPage.deleteConfirmMessage" : "openVndPage.deleteAnyConfirmMessage", {name: vnd.name})}
            confirmLabel={step === 1 ? t("general.delete") : t("openVndPage.deleteContinue")}
            loadingLabel={step === 1 ? t("general.deleting") : t("openVndPage.deleteChecking")}
            loading={deleting}
            error={flow.error}
            variant="danger"
            icon={Trash2}
            wide={!isDraft}
        >
            {step === 0 ? (<>
                {!isDraft && (
                    <div className="mb-4 overflow-hidden rounded-[12px] border border-[#f0dcae] bg-[#fffaf0] text-left">
                        <div className="flex items-center gap-2 border-b border-[#f0dcae] bg-[#fff3d6] px-3.5 py-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-[#9a6408]" strokeWidth={2.2}/>
                            <span className="text-[12.5px] font-bold text-[#7a4f06]">
                                {t("openVndPage.deleteAnyWarnTitle")}
                            </span>
                        </div>
                        <div className="space-y-2.5 px-3.5 py-3 text-[12.5px] leading-[1.5] text-[#6b5a2e]">
                            <p>{t("openVndPage.deleteAnyWarnExtreme")}</p>
                            <div className="flex items-start gap-2 rounded-[9px] bg-white/70 px-2.5 py-2 text-[#3a4560]">
                                <EyeOff className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#8b97ab]" strokeWidth={2}/>
                                <p>{t("openVndPage.deleteAnyWarnScope")}</p>
                            </div>
                            <div className="flex items-start gap-2 rounded-[9px] bg-[#ececfc]/70 px-2.5 py-2 text-[#3a4a9e]">
                                <RotateCcw className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#4e57d6]" strokeWidth={2}/>
                                <p>{t("openVndPage.deleteAnyWarnRestore")}</p>
                            </div>
                        </div>
                        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-[#f6f8fb] px-5 py-4 text-left">
                            <div className="mb-3 text-[12px] font-bold uppercase tracking-wide text-[#8b97ab]">
                                {t("openVndPage.deleteAnyWillTitle")}
                            </div>
                            <ul className="space-y-2.5">
                                {[1, 2, 3, 4, 5].map((k) => (
                                    <li key={k} className="flex items-start gap-2.5 text-[12.5px] leading-[1.5] text-[#3a4560]">
                                        <CheckCircle2 className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#1a8a5f]" strokeWidth={2.2}/>
                                        <span>{t(`openVndPage.deleteAnyWill${k}`)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
                <div className="text-left">
                    <label htmlFor="vnd-delete-password" className="mb-1.5 block text-[12.5px] font-bold text-[#3a4560]">
                        {t("openVndPage.deletePasswordLabel")}
                    </label>
                    <input
                        id="vnd-delete-password"
                        type="password"
                        autoComplete="current-password"
                        autoFocus
                        value={flow.password}
                        disabled={deleting}
                        onChange={(e) => flow.changePassword(e.target.value)}
                        onKeyDown={submitOnEnter}
                        placeholder={t("openVndPage.deletePasswordPlaceholder")}
                        className={INPUT_CLASS}
                    />
                    <p className="mt-1.5 text-[11.5px] leading-[1.4] text-[#8b97ab]">
                        {t("openVndPage.deletePasswordHint")}
                    </p>
                </div>
            </>) : (
                <div className="rounded-[12px] border border-[#e5e9f0] bg-[#f6f8fb] px-5 py-4 text-left">
                    <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold text-[#1a8a5f]">
                        <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.2}/>
                        {t("openVndPage.deleteStep2Verified")}
                    </div>
                    <label htmlFor="vnd-delete-captcha" className="mb-2 block text-[12.5px] font-bold text-[#3a4560]">
                        {t("openVndPage.deleteCaptchaLabel")}
                    </label>
                    <div className="mb-3 select-none rounded-[9px] border border-dashed border-[#e3b4ae] bg-white px-4 py-2.5 text-center text-[15px] font-bold text-[#c0392b]">
                        {flow.confirmPhrase}
                    </div>
                    <input
                        id="vnd-delete-captcha"
                        type="text"
                        autoComplete="off"
                        autoFocus
                        value={flow.captcha}
                        disabled={deleting}
                        onChange={(e) => flow.changeCaptcha(e.target.value)}
                        onKeyDown={submitOnEnter}
                        className={INPUT_CLASS}
                    />
                </div>
            )}
        </ConfirmActionModal>
    );
}
