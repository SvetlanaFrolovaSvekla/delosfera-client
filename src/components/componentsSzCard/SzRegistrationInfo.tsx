// Регистрация и сроки: автор, подразделение, дата регистрации, срок исполнения.
import {useTranslation} from "react-i18next";
import {colors} from "@/design/tokens.ts";
import type {SzDetails} from "@/service/szService/szService.ts";
import {ReadOnlyField} from "@/components/componentsGeneral/readOnlySelects/ReadOnlyField.tsx";
import {SzPanel} from "@/components/componentsSzCard/SzPanel.tsx";
import {formatDate} from "@/components/componentsSzCard/szCardUtils.ts";

export function SzRegistrationInfo({sz}: { sz: SzDetails }) {
    const {t} = useTranslation();

    return (
        <SzPanel>
            <h2 className="m-0 mb-3 text-[15px] font-semibold">{t("szCard.registration.title")}</h2>
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
