// Регистрация и сроки: автор, подразделение, дата регистрации, срок исполнения.
import {useTranslation} from "react-i18next";
import type {SzDetails} from "@/service/szService/szService.ts";
import {SzPanel} from "@/components/componentsSz/SzPanel.tsx";
import {formatDate} from "@/utils/szProcess/szCardUtils.ts";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {colors} from "@/design/tokens.ts";

export function SzRegistrationPanel({sz}: { sz: SzDetails }) {
    const {t} = useTranslation();

    return (
        <SzPanel>
            <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd] mb-4">
                {t("szCard.registration.title")}
            </div>
            <div className="grid grid-cols-4 gap-4">
                <ReadOnlyField label={t("szCard.registration.author")} value={sz.author ?? "—"}/>
                <ReadOnlyField label={t("szCard.registration.authorUnit")} value={sz.authorUnit ?? "—"}/>
                <ReadOnlyField label={t("szCard.registration.registeredOn")} value={formatDate(sz.registeredOn)}/>
                <ReadOnlyField
                    label={t("szCard.registration.dueDate")}
                    value={sz.dueDate
                        ? (
                            <span className="inline-flex items-center gap-2">
                                {formatDate(sz.dueDate)}
                                <span className="text-[11.5px] font-semibold"
                                      style={{color: sz.isOverdue ? colors.ryg.red.fg : colors.inkSubtle}}>
                                    {sz.isOverdue
                                        ? t("szRegistry.daysOverdue", {n: Math.abs(sz.daysLeft ?? 0)})
                                        : t("szRegistry.daysLeft", {n: sz.daysLeft ?? 0})}
                                </span>
                            </span>
                        )
                        : "—"}
                />
            </div>
        </SzPanel>
    );
}
