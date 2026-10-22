// Кнопки решений панели резолюции: слева кнопки с подписью ЭЦП (обязательна для любого решения;
// в тестовом режиме рядом - кнопки без ЭЦП, только пока на сервере включён EcpSigning:AllowWithoutEcp),
// справа - пояснение, к чему приведёт именно это решение на текущей фазе. Ниже, если на сервере включён
// EcpSigning:AllowVndTestEcp, - блок "ТЕСТ: имитация ЭЦП" (как в согласовании СЗ): решение проходит без
// ПИН/кода/подписи ГП «Инфоком», в журнале и листе согласования помечается как тестовая имитация.
// Если у пользователя право SignWithoutNationalEcp (сотрудник без ЭЦП КР), основные кнопки подписывают
// не ЭЦП ГП «Инфоком», а локальной подписью системы «Делосфера» (mode "system", с модалкой подтверждения).
// Логика нажатия (проверки, подтверждение "Отклонить", подпись) - в VndApproverResolutionPanel.
import {useTranslation} from "react-i18next";
import {ShieldCheck} from "lucide-react";
import type {DecisionMode, ResolutionChoice, ResolutionPhase} from "./resolutionPanelTypes.ts";
import {
    ACTIONS, CHOICE_THEME, DECISION_BUTTON_SHADOW, HINT_ACCENT, TEST_ACTION_STYLE,
} from "../../../../../constants/vndConstants/resolutionDecisionTheme.ts";

interface ResolutionDecisionButtonsProps {
    phase: ResolutionPhase;
    testMode: boolean;
    /** Тестовая имитация ЭЦП (EcpSigning:AllowVndTestEcp). */
    testEcpMode: boolean;
    /** Право SignWithoutNationalEcp: основные кнопки подписывают системой «Делосфера», а не ЭЦП КР. */
    systemSignMode?: boolean;
    /** Ключ системной подписи не настроен на сервере - кнопки системной подписи недоступны. */
    systemSealUnavailable?: boolean;
    busy: boolean | undefined;
    composedTooLong: boolean;
    submitting: boolean | undefined;
    /** Последняя нажатая кнопка решения - на ней показываем "Отправка…". */
    lastAction: {choice: ResolutionChoice; mode: DecisionMode} | null;
    onAction: (c: ResolutionChoice, mode: DecisionMode) => void;
}

export function ResolutionDecisionButtons({
    phase, testMode, testEcpMode, systemSignMode = false, systemSealUnavailable = false,
    busy, composedTooLong, submitting, lastAction, onAction,
}: ResolutionDecisionButtonsProps) {
    const {t} = useTranslation();
    const mainMode = systemSignMode ? "system" : "ecp";
    return (
        <div className="mt-5 flex flex-col gap-3">
            {systemSignMode && (
                <div className={`flex items-start gap-2 rounded-[12px] border px-3.5 py-2.5 text-[12px] leading-[1.5] ${
                    systemSealUnavailable
                        ? "border-[#f3dfb0] bg-[#fdf7e8] text-[#8a6100]"
                        : "border-[#bfe3dd] bg-[#eef8f6] text-[#0f5e5a]"
                }`}>
                    <ShieldCheck className="mt-[1px] h-4 w-4 flex-none" strokeWidth={2.4}/>
                    <span>
                        {systemSealUnavailable
                            ? t("resolutionPanel.systemSign.unavailable")
                            : t("resolutionPanel.systemSign.banner")}
                    </span>
                </div>
            )}
            {ACTIONS.map((c) => {
                const actionTheme = CHOICE_THEME[c];
                const Icon = actionTheme.icon;
                const isRunning = submitting && lastAction?.choice === c;
                const hint = t(`resolutionPanel.hints.${phase}.${c}`);
                return (
                    <div key={c} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex flex-none flex-wrap items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => onAction(c, mainMode)}
                                disabled={busy || composedTooLong || (systemSignMode && systemSealUnavailable)}
                                className={`group cursor-pointer flex w-[380px] max-w-full items-center justify-center gap-2.5 rounded-[12px] px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${DECISION_BUTTON_SHADOW[c]} ${actionTheme.buttonBg} ${actionTheme.buttonHover}`}
                            >
                                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30">
                                    <Icon className="h-[14px] w-[14px]" strokeWidth={2.6}/>
                                </span>
                                {isRunning && lastAction?.mode === mainMode
                                    ? t("resolutionPanel.sending")
                                    : t(systemSignMode ? `resolutionPanel.systemLabel.${c}` : `resolutionPanel.ecpLabel.${c}`)}
                            </button>
                            {testMode && (
                                <button
                                    type="button"
                                    onClick={() => onAction(c, "withoutEcp")}
                                    disabled={busy || composedTooLong}
                                    className={`cursor-pointer flex w-[300px] max-w-full items-center justify-center gap-2 rounded-[12px] border border-dashed bg-white px-4 py-[11px] text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${TEST_ACTION_STYLE[c]}`}
                                >
                                    <Icon className="h-4 w-4" strokeWidth={2.5}/>
                                    {isRunning && lastAction?.mode === "withoutEcp" ? t("resolutionPanel.sending") : t(`resolutionPanel.testLabel.${c}`)}
                                </button>
                            )}
                        </div>
                        {hint && (
                            <div className={`min-w-[220px] flex-1 border-l-2 pl-3 text-[12px] leading-[1.45] text-[#6b7688] ${HINT_ACCENT[c]}`}>
                                {hint}
                            </div>
                        )}
                    </div>
                );
            })}
            {testEcpMode && (
                <div className="rounded-[12px] border border-dashed border-[#f0dcae] bg-[#fffaf0] px-3.5 py-3">
                    <div className="mb-2 text-[12px] font-semibold text-[#8a5a00]">
                        {t("resolutionPanel.testEcpTitle")}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {ACTIONS.map((c) => {
                            const isRunning = submitting && lastAction?.choice === c && lastAction.mode === "testEcp";
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => onAction(c, "testEcp")}
                                    disabled={busy || composedTooLong}
                                    className={`cursor-pointer flex items-center gap-1.5 rounded-[10px] border border-dashed bg-white px-3 py-[7px] text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${TEST_ACTION_STYLE[c]}`}
                                >
                                    <ShieldCheck className="h-[14px] w-[14px]" strokeWidth={2.4}/>
                                    {isRunning ? t("resolutionPanel.sending") : t(`resolutionPanel.testEcpLabel.${c}`)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
