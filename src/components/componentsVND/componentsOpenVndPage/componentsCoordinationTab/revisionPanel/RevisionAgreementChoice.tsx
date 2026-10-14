// Вопрос "Согласны ли вы с замечаниями": три варианта ответа радиокнопками.
import {useTranslation} from "react-i18next";
import {RemarksAgreement} from "@/service/coordinationService/coordinationServiceTypes.ts";

interface RevisionAgreementChoiceProps {
    remarksAgreement: RemarksAgreement | null;
    onChange: (value: RemarksAgreement) => void;
}

export function RevisionAgreementChoice({
    remarksAgreement, onChange: setRemarksAgreement,
}: RevisionAgreementChoiceProps) {
    const {t} = useTranslation();
    return (
        <div role="radiogroup" className="flex flex-wrap gap-3">
            {([
                {label: t("coordinationUi.revision.agreeYes"), value: RemarksAgreement.FullyAgree},
                {label: t("coordinationUi.revision.agreePartial"), value: RemarksAgreement.PartiallyAgree},
                {label: t("coordinationUi.revision.agreeNo"), value: RemarksAgreement.FullyDisagree},
            ] as const).map(({label, value}) => {
                const isSelected = remarksAgreement === value;
                return (
                    <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setRemarksAgreement(value)}
                        className={`bg-white text-[#3a4560] font-medium hover:bg-[#f6f8fb] inline-flex items-center gap-2 h-9 px-4 rounded-[9px] text-[13px] cursor-pointer transition-colors`}
                    >
                        <span
                            className={`grid h-[16px] w-[16px] flex-none place-items-center rounded-full border-2 ${
                                isSelected ? "border-[#4e57d6]" : "border-[#c3c9d4]"
                            }`}
                        >
                            {isSelected && <span className="h-[8px] w-[8px] rounded-full bg-[#4e57d6]"/>}
                        </span>
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
