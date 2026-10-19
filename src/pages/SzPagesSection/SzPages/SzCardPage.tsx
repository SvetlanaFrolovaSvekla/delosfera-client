// Карточка служебной записки: создание, правка автором, согласование, подписание и ведение
// записки по стадиям.
// Состояние - в хуках useSzCard / useSzApproval,
// части страницы - в componentsSzCard.
import {useState} from "react";
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";

import {useSzCard} from "@/hooks/sz/useSzCard.ts";
import {useSzApproval} from "@/hooks/sz/useSzApproval.ts";
import {useSzUsers} from "@/hooks/sz/useSzUsers.ts";

import {SzTemplateBar} from "@/components/componentsSz/componentsSzCard/controls/SzTemplateBar.tsx";
import {SzTracePanel} from "@/components/componentsSz/componentsSzCard/panels/SzTracePanel.tsx";
import {SzDuplicateWarning} from "@/components/componentsSz/componentsSzCard/SzDuplicateWarning.tsx";
import {SzCardHeader} from "@/components/componentsSz/componentsSzCard/SzCardHeader.tsx";
import {
    SzCardNotices,
    SzStatusBanner,
    SzWithdrawnBanner
} from "@/components/componentsSz/componentsSzCard/SzCardNotices.tsx";
import {SzForceStatusPanel} from "@/components/componentsSz/componentsSzCard/panels/SzForceStatusPanel.tsx";
import {SzWithdrawPanel} from "@/components/componentsSz/componentsSzCard/panels/SzWithdrawPanel.tsx";
import {SzMainForm} from "@/components/componentsSz/componentsSzCard/form/SzMainForm.tsx";
import {SzStatusPanels} from "@/components/componentsSz/componentsSzCard/panels/SzStatusPanels.tsx";
import {SzExecutionPanel} from "@/components/componentsSz/componentsSzCard/statuses/SzExecutionPanel.tsx";
import {SzApprovalSection} from "@/components/componentsSz/componentsApprovals/SzApprovalSection.tsx";
import {SzAddresseeDecisionPanel} from "@/components/componentsSz/componentsSzCard/panels/SzAddresseeDecisionPanel.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";

export function SzCardPage() {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const {user} = useAuth();
    const {users, userList} = useSzUsers();

    const card = useSzCard(id);
    const {sz, route, form, formKey, isNew, editable, saving, notice, error} = card;
    const approval = useSzApproval({
        szId: sz?.id,
        route,
        actingForUserIds: sz?.actingForUserIds,
        setSaving: card.setSaving,
        setError: card.setError,
        setNotice: card.setNotice,
        reload: card.reload,
    });

    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [forceOpen, setForceOpen] = useState(false);

    if (card.loading) return <Loader/>;

    return (
        <div className="px-7 py-6 max-w-[1700px]">

            {/* Название, статус, код, кнопки */}
            <SzCardHeader
                card={card}
                onToggleWithdraw={() => setWithdrawOpen((v) => !v)}
                onToggleForce={() => setForceOpen((v) => !v)}
            />


            {/* Статус, сообщения */}
            {sz && <SzStatusBanner statusCode={sz.statusCode} isAuthor={card.isAuthor}/>}

            <SzCardNotices notice={notice} error={error}/>

            {/* Ручной перевод статуса записки */}
            {forceOpen && (
                <SzForceStatusPanel
                    saving={saving}
                    onSubmit={card.forceStatus}
                    onDone={() => setForceOpen(false)}
                />
            )}

            {/* Отзыв СЗ */}
            {withdrawOpen && (
                <SzWithdrawPanel
                    saving={saving}
                    onSubmit={card.withdraw}
                    onClose={() => setWithdrawOpen(false)}
                />
            )}

            {/* Сообщение об отзыве. Отзыв ставит статус «Отозвана»; «Черновик» — записки,
                отозванные до того, как этот статус появился. Раньше проверялся только
                черновик, и плашка с причиной отзыва не показывалась никогда. */}
            {sz?.withdrawReason && (sz.statusCode === "Withdrawn" || sz.statusCode === "Draft") && (
                <SzWithdrawnBanner text={t("szCard.withdraw.banner", {reason: sz.withdrawReason})}/>
            )}

            {/* Фильтр, шаблон */}
            {isNew && (
                <SzTemplateBar
                    form={form}
                    disabled={!editable}
                    onApply={(patch) => card.setForm((f) => ({...f, ...patch}))}
                />
            )}

            {/* Предупреждение о возможном дубликате записки*/}
            {isNew && <SzDuplicateWarning kindId={form.kindId} title={form.title}/>}

            {/* Основная форма записки (создания/редактирования) */}
            <SzMainForm card={card} userList={userList}/>

            {/* Решение адресата по существу вопроса */}
            {sz && (
                <SzAddresseeDecisionPanel
                    sz={sz}
                    currentUserId={user?.id}
                    users={userList}
                    onDecided={card.applyDetails}
                />
            )}

            {/* Статус: Бумажный оригинал */}
            {sz && <SzStatusPanels sz={sz} formKey={formKey} onChanged={card.reload}/>}

            {/* Путь записки */}
            {!isNew && id && <SzTracePanel szId={Number(id)} statusCode={sz?.statusCode}/>}

            {/* Маршрут есть, но не загрузился — показываем причину вместо пустоты. */}
            {sz?.currentRouteInstanceId && !route && card.routeError && (
                <div className="mt-4 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-3 text-[13px] text-[#c0392b]">
                    {t("szCard.approval.routeLoadFailed", {error: card.routeError})}
                    <button type="button" onClick={() => void card.reload()}
                            className="ml-3 cursor-pointer border-none bg-transparent font-semibold text-[#2f68f5] underline">
                        {t("szCard.approval.retry")}
                    </button>
                </div>
            )}

            {/* Блок "Согласование" */}
            {route && sz && (
                <SzApprovalSection
                    sz={sz}
                    route={route}
                    users={users}
                    approval={approval}
                    currentUserId={user?.id}
                    saving={saving}
                />
            )}

            {/* Исполнение начинается после согласования — панель ведёт поручения и сроки. */}
            {sz && (sz.statusCode === "OnExecution" || sz.statusCode === "Executed") && (
                <SzExecutionPanel sz={sz} onChanged={card.reload}/>
            )}
        </div>
    );
}
