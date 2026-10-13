// Поле выбора "Уровень секретности" для карточки ВНД: в окне выбора сверху пояснение,
// что пока уровень работает как тег и сам доступ к документу не ограничивает.
import type {ComponentProps} from "react";
import {useTranslation} from "react-i18next";
import {Info} from "lucide-react";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";

type SecrecyLevelSelectFieldProps = Omit<ComponentProps<typeof SingleSelectListField>, "modalHint">;

export function SecrecyLevelSelectField(props: SecrecyLevelSelectFieldProps) {
    const {t} = useTranslation();

    return (
        <SingleSelectListField
            {...props}
            modalHint={
                <span className="flex items-start gap-2">
                    <Info size={14} className="mt-[2px] flex-none text-[#4e57d6]" strokeWidth={2}/>
                    <span>{t("secrecyLevelAccess.hint")}</span>
                </span>
            }
        />
    );
}
