import {useState} from "react";
import {DirectoryIntegrationForm} from "@/components/system/DirectoryIntegrationForm.tsx";
import {ProcurementParametersForm} from "@/components/system/ProcurementParametersForm.tsx";
import {SignatureLevelForm} from "@/components/system/SignatureLevelForm.tsx";
import {CertificateAuthoritiesForm} from "@/components/system/CertificateAuthoritiesForm.tsx";
import {SigningSettingsForm} from "@/components/system/SigningSettingsForm.tsx";
import {OrgStructureIntegrationForm} from "@/components/system/OrgStructureIntegrationForm.tsx";
import {MailSettingsForm} from "@/components/system/MailSettingsForm.tsx";

type IntegrationState = { enabled: boolean; hasError: boolean } | null;

interface Integration {
    id: string;
    title: string;
    subtitle: string;

    /** Форма настроек; отсутствует у интеграций, которые пока живут в конфигурации сервера. */
    render?: (report: (enabled: boolean, hasError: boolean) => void) => React.ReactNode;

    /** Чем настраивается, пока раздела нет. */
    note?: string;
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
        title: "Служба каталогов",
        subtitle: "LDAP · пользователи домена",
        render: (report) => <DirectoryIntegrationForm onStateChange={report}/>,
    },
    {
        id: "org-structure",
        title: "Организационная структура",
        subtitle: "Портал банка · подразделения и подчинённость",
        render: (report) => <OrgStructureIntegrationForm onStateChange={report}/>,
    },
    {
        // Не интеграция, но живёт по тем же правилам: значения, которые задаёт
        // администратор и от которых зависит поведение контура.
        id: "procurement",
        title: "Параметры закупок",
        subtitle: "Пороги Положения и Матрицы полномочий",
        render: () => <ProcurementParametersForm/>,
    },
    {
        id: "signature",
        title: "Электронная подпись",
        subtitle: "Чем закрываются этапы согласования",
        render: () => <SignatureLevelForm/>,
    },
    {
        id: "authorities",
        title: "Удостоверяющие центры",
        subtitle: "Кому банк доверяет выпуск сертификатов",
        render: () => <CertificateAuthoritiesForm/>,
    },
    {
        id: "timestamp",
        title: "Метка времени и отзыв",
        subtitle: "Служба меток RFC 3161 · списки отзыва",
        render: () => <SigningSettingsForm/>,
    },
    {
        id: "mail",
        title: "Почтовые уведомления",
        subtitle: "SMTP · письма о задачах и сроках",
        render: (report) => <MailSettingsForm onStateChange={report}/>,
    },
];

function StateDot({state}: { state: IntegrationState }) {
    if (!state) return <span className="h-2 w-2 rounded-full bg-[#d6dded]"/>;

    const color = state.hasError ? "#c0392b" : state.enabled ? "#1f8a4c" : "#a6b0c2";
    const title = state.hasError ? "Есть ошибка" : state.enabled ? "Включена" : "Выключена";

    return <span className="h-2 w-2 rounded-full" style={{background: color}} title={title}/>;
}

/**
 * Системные настройки: интеграции с внешними системами.
 *
 * Раздел для администратора системы, а не администратора сервера: адреса,
 * учётные записи и расписания задаются здесь и вступают в силу без перезапуска.
 */
export function SystemSettingsPage() {
    const [selected, setSelected] = useState(INTEGRATIONS[0].id);
    const [states, setStates] = useState<Record<string, IntegrationState>>({});

    const current = INTEGRATIONS.find((x) => x.id === selected) ?? INTEGRATIONS[0];

    const report = (id: string) => (enabled: boolean, hasError: boolean) =>
        setStates((s) => (s[id]?.enabled === enabled && s[id]?.hasError === hasError
            ? s
            : {...s, [id]: {enabled, hasError}}));

    return (
        <div className="p-6">
            <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Системные настройки</h1>
            <div className="mt-1 text-[13px] text-[#8b97ab]">
                Интеграции с внешними системами: адреса, учётные записи и расписания обмена
            </div>

            <div className="mt-5 grid gap-5" style={{gridTemplateColumns: "minmax(220px, 280px) 1fr"}}>
                <aside className="rounded-[12px] border border-[#e5e9f0] bg-white p-2 self-start">
                    {INTEGRATIONS.map((integration) => {
                        const active = integration.id === selected;

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
                                        {integration.title}
                                    </span>
                                </span>
                                <span className="mt-0.5 block pl-4 text-[11.5px] text-[#8b97ab]">
                                    {integration.subtitle}
                                </span>
                            </button>
                        );
                    })}
                </aside>

                <section>
                    {current.render
                        ? current.render(report(current.id))
                        : (
                            <div className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                                <h2 className="m-0 text-[15px] font-semibold">{current.title}</h2>
                                <div className="mt-2 text-[13px] leading-[1.7] text-[#55617a]">{current.note}</div>
                            </div>
                        )}
                </section>
            </div>
        </div>
    );
}
