// Поле выбора "Уровень секретности" для карточки ВНД: в окне выбора сверху пояснение,
// что пока уровень работает как тег и сам доступ к документу не ограничивает.
import type {ComponentProps} from "react";
import {useTranslation} from "react-i18next";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {Info} from "lucide-react";
import {ACCENT} from "@/constants/accent.ts";

type SecrecyLevelSelectFieldProps = Omit<ComponentProps<typeof SingleSelectListField>, "modalHint">;

export function SecrecyLevelSelectField(props: SecrecyLevelSelectFieldProps) {
    const {t} = useTranslation();
    const a = ACCENT[props.accent ?? "violet"];

    return (
        <SingleSelectListField
            {...props}
            modalHint={
                <span className="flex items-start gap-2">
                    <Info size={14} className={`mt-[2px] flex-none ${a.text}`} strokeWidth={2}/>
                    <span>{t("secrecyLevelAccess.hint")}</span>
                </span>
            }
        />
    );
}
