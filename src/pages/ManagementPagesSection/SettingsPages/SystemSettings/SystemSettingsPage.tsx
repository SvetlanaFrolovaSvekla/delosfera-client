/**
 * Системные настройки (Интеграции):
 * Служба каталогов, Организационная структура, Параметры закупок, Нумерация замещений, Почтовые уведомления
 */
import React, {useState} from "react";
import {useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {DirectoryIntegrationForm} from "@/components/componentsSystemSettings/DirectoryIntegrationForm.tsx";
import {ProcurementParametersForm} from "@/components/componentsSystemSettings/ProcurementParametersForm.tsx";
import {SignatureLevelForm} from "@/components/componentsSystemSettings/SignatureLevelForm.tsx";
import {CertificateAuthoritiesForm} from "@/components/componentsSystemSettings/CertificateAuthoritiesForm.tsx";
import {SigningSettingsForm} from "@/components/componentsSystemSettings/SigningSettingsForm.tsx";
import {OrgStructureIntegrationForm} from "@/components/componentsSystemSettings/OrgStructureIntegrationForm.tsx";
import {MailSettingsForm} from "@/components/componentsSystemSettings/MailSettingsForm.tsx";
import {SubstitutionNumberingForm} from "@/components/componentsSystemSettings/SubstitutionNumberingForm.tsx";
import {StateDot} from "@/components/componentsGeneral/dots/StateDot.tsx";

export type IntegrationState = { enabled: boolean; hasError: boolean } | null;

type SettingsGroup = "integration" | "signing";

export interface Integration {
    id: string;
    titleKey: string;
    subtitleKey: string;
    group: SettingsGroup;

    /** Форма настроек; отсутствует у интеграций, которые пока живут в конфигурации сервера. */
    render?: (report: (enabled: boolean, hasError: boolean) => void) => React.ReactNode;

    /** Чем настраивается, пока раздела нет. */
    noteKey?: string;
}

/**
 * Реестр интеграций.
 *
 * Интеграций будет несколько — почта, обмен документами, подпись, — поэтому
 * раздел построен списком: добавление следующей означает новую запись здесь и
 * свою форму, а не переделку страницы.
 */
const INTEGRATIONS: Integration[] = [
    {
        id: "directory",
        titleKey: "systemSettings.directory.title" /* Служба каталогов */,
        subtitleKey: "systemSettings.directory.subtitle" /* LDAP · пользователи домена */,
        group: "integration",
        render: (report) => <DirectoryIntegrationForm onStateChange={report}/>,
    },
    {
        id: "org-structure",
        titleKey: "systemSettings.orgStructure.title" /* Организационная структура */,
        subtitleKey: "systemSettings.orgStructure.subtitle" /* Портал банка · подразделения и подчинённость */,
        group: "integration",
        render: (report) => <OrgStructureIntegrationForm onStateChange={report}/>,
    },
    {
        // Не интеграция, но живёт по тем же правилам: значения, которые задаёт
        // администратор и от которых зависит поведение контура.
        id: "procurement",
        titleKey: "systemSettings.procurement.title" /* Параметры закупок */,
        subtitleKey: "systemSettings.procurement.subtitle" /* Пороги Положения и Матрицы полномочий */,
        group: "integration",
        render: () => <ProcurementParametersForm/>,
    },
    {
        id: "substitution-numbering",
        titleKey: "systemSettings.substitutionNumbering.title" /* Нумерация замещений */,
        subtitleKey: "systemSettings.substitutionNumbering.subtitle" /* Формат номера заявки и счётчик (HR-1, HR-2, …) */,
        group: "integration",
        render: () => <SubstitutionNumberingForm/>,
    },
    {
        id: "mail",
        titleKey: "systemSettings.mail.title" /* Почтовые уведомления */,
        subtitleKey: "systemSettings.mail.subtitle" /* SMTP · письма о задачах и сроках */,
        group: "integration",
        render: (report) => <MailSettingsForm onStateChange={report}/>,
    },
    {
        id: "signature",
        titleKey: "systemSettings.signature.title" /* Электронная подпись */,
        subtitleKey: "systemSettings.signature.subtitle" /* Чем закрываются этапы согласования */,
        group: "signing",
        render: () => <SignatureLevelForm/>,
    },
    {
        id: "authorities",
        titleKey: "systemSettings.authorities.title" /* Удостоверяющие центры */,
        subtitleKey: "systemSettings.authorities.subtitle" /* Кому банк доверяет выпуск сертификатов */,
        group: "signing",
        render: () => <CertificateAuthoritiesForm/>,
    },
    {
        id: "timestamp",
        titleKey: "systemSettings.timestamp.title" /* Метка времени и отзыв */,
        subtitleKey: "systemSettings.timestamp.subtitle" /* Служба меток RFC 3161 · списки отзыва */,
        group: "signing",
        render: () => <SigningSettingsForm/>,
    },
];

/**
 * Системные настройки: интеграции с внешними системами.
 *
 * Раздел для администратора системы, а не администратора сервера: адреса,
 * учётные записи и расписания задаются здесь и вступают в силу без перезапуска.
 */
export function SystemSettingsPage() {
    const {t} = useTranslation();
    const {pathname} = useLocation();
    // Один компонент на два пункта меню: подписание отдельно от интеграций (НС-1).
    const mode: SettingsGroup = pathname.endsWith("/signing") ? "signing" : "integration";
    const items = INTEGRATIONS.filter((x) => x.group === mode);

    const [selected, setSelected] = useState(items[0].id);
    const [states, setStates] = useState<Record<string, IntegrationState>>({});

    // Выбранная вкладка может остаться от другого раздела при переходе между
    // пунктами меню — тогда откатываемся на первую вкладку текущего раздела.
    const current = items.find((x) => x.id === selected) ?? items[0];

    const heading = mode === "signing"
        ? t("systemSettings.signingHeading") /* Настройки подписания */
        : t("systemSettings.heading") /* Системные настройки */;
    const subheading = mode === "signing"
        ? t("systemSettings.signingSubheading") /* Электронная подпись, удостоверяющие центры, метки времени и отзыв */
        : t("systemSettings.subheading") /* Интеграции с внешними системами: адреса, учётные записи и расписания обмена */;

    const report = (id: string) => (enabled: boolean, hasError: boolean) =>
        setStates((s) => (s[id]?.enabled === enabled && s[id]?.hasError === hasError
            ? s
            : {...s, [id]: {enabled, hasError}}));

    return (
        <div className="p-6">
            <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">{heading}</h1>
            <div className="mt-1 text-[13px] text-[#8b97ab]">{subheading}</div>

            <div className="mt-5 grid gap-5" style={{gridTemplateColumns: "minmax(220px, 280px) 1fr"}}>
                <aside className="rounded-[12px] border border-[#e5e9f0] bg-white p-2 self-start">
                    {items.map((integration) => {
                        const active = integration.id === current.id;

                        return (
                            <button
                                key={integration.id}
                                onClick={() => setSelected(integration.id)}
                                className={`w-full rounded-[9px] px-3 py-2.5 text-left cursor-pointer border-none ${
                                    active ? "bg-[#e9f0ff]" : "bg-transparent hover:bg-[#f6f8fb]"}`}
                            >
                                <span className="flex items-center gap-2">
                                    <StateDot state={states[integration.id] ?? null}/>
                                    <span className={`text-[13px] font-semibold ${
                                        active ? "text-[#2f68f5]" : "text-[#1c2740]"}`}>
                                        {t(integration.titleKey)}
                                    </span>
                                </span>
                                <span className="mt-0.5 block pl-4 text-[11.5px] text-[#8b97ab]">
                                    {t(integration.subtitleKey)}
                                </span>
                            </button>
                        );
                    })}
                </aside>

                <section className="min-w-0">
                    {current.render
                        ? current.render(report(current.id))
                        : (
                            <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                                <h2 className="m-0 text-[15px] font-semibold">{t(current.titleKey)}</h2>
                                <div className="mt-2 text-[13px] leading-[1.7] text-[#55617a]">
                                    {current.noteKey && t(current.noteKey)}
                                </div>
                            </div>
                        )}
                </section>
            </div>
        </div>
    );
}