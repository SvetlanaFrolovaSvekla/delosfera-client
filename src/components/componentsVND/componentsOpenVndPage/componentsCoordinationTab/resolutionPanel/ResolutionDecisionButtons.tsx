// Кнопки решений панели резолюции: слева кнопки с подписью ЭЦП (обязательна для любого решения;
// в тестовом режиме рядом - кнопки без ЭЦП, только пока на сервере включён EcpSigning:AllowWithoutEcp),
// справа - пояснение, к чему приведёт именно это решение на текущей фазе.
// Логика нажатия (проверки, подтверждение "Отклонить", подпись) - в VndApproverResolutionPanel.
import {useTranslation} from "react-i18next";
import type {ResolutionChoice, ResolutionPhase} from "./resolutionPanelTypes.ts";
import {
    ACTIONS, CHOICE_THEME, DECISION_BUTTON_SHADOW, HINT_ACCENT, TEST_ACTION_STYLE,
} from "../../../../../constants/vndConstants/resolutionDecisionTheme.ts";

interface ResolutionDecisionButtonsProps {
    phase: ResolutionPhase;
    testMode: boolean;
    busy: boolean | undefined;
    composedTooLong: boolean;
    submitting: boolean | undefined;
    /** Последняя нажатая кнопка решения - на ней показываем "Отправка…". */
    lastAction: {choice: ResolutionChoice; withEcp: boolean} | null;
    onAction: (c: ResolutionChoice, withEcp: boolean) => void;
}

export function ResolutionDecisionButtons({
    phase, testMode, busy, composedTooLong, submitting, lastAction, onAction,
}: ResolutionDecisionButtonsProps) {
    const {t} = useTranslation();
    return (
        <div className="mt-5 flex flex-col gap-3">
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
                                onClick={() => onAction(c, true)}
                                disabled={busy || composedTooLong}
                                className={`group cursor-pointer flex w-[380px] max-w-full items-center justify-center gap-2.5 rounded-[12px] px-5 py-[11px] text-[13.5px] font-semibold text-white transition-all duration-150 hover:-translate-y-px active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${DECISION_BUTTON_SHADOW[c]} ${actionTheme.buttonBg} ${actionTheme.buttonHover}`}
                            >
                                <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-white/20 transition-colors group-hover:bg-white/30">
                                    <Icon className="h-[14px] w-[14px]" strokeWidth={2.6}/>
                                </span>
                                {isRunning && lastAction?.withEcp ? t("resolutionPanel.sending") : t(`resolutionPanel.ecpLabel.${c}`)}
                            </button>
                            {testMode && (
                                <button
                                    type="button"
                                    onClick={() => onAction(c, false)}
                                    disabled={busy || composedTooLong}
                                    className={`cursor-pointer flex w-[300px] max-w-full items-center justify-center gap-2 rounded-[12px] border border-dashed bg-white px-4 py-[11px] text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${TEST_ACTION_STYLE[c]}`}
                                >
                                    <Icon className="h-4 w-4" strokeWidth={2.5}/>
                                    {isRunning && !lastAction?.withEcp ? t("resolutionPanel.sending") : t(`resolutionPanel.testLabel.${c}`)}
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
        </div>
    );
}
