import {useTranslation} from "react-i18next";
import {colors} from "@/design/tokens.ts";
import {formatDate} from "./registryModel.ts";

interface Props {
    dueDate: string | null;
    isOverdue: boolean;
    daysLeft: number | null;
    /** Что показать, когда срока нет. */
    fallback?: string;
}

/** Срок + «−3 дн» / «через 5 дн» рядом с ним. */
export function DueCell({dueDate, isOverdue, daysLeft, fallback = "—"}: Props) {
    const {t} = useTranslation();
    if (!dueDate) return <>{fallback}</>;
    return (
        <span className="inline-flex items-center gap-2">
            <span>{formatDate(dueDate)}</span>
            <span className="text-[11.5px] font-semibold"
                  style={{color: isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                {isOverdue
                    ? t("szRegistry.daysOverdue", {n: Math.abs(daysLeft ?? 0)})
                    : t("szRegistry.daysLeft", {n: daysLeft ?? 0})}
            </span>
        </span>
    );
}
