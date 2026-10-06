// Карточка служебной записки: создание, правка автором, согласование, подписание и ведение
// записки по стадиям. Состояние — в хуках useSzCard / useSzApproval, части страницы — в componentsSzCard.
import {useState} from "react";
import {useParams} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/AuthContext.ts";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {SzTemplateBar} from "@/components/componentsSz/SzTemplateBar.tsx";
import {SzTracePanel} from "@/components/componentsSz/SzTracePanel.tsx";
import {SzDuplicateWarning} from "@/components/componentsSz/SzDuplicateWarning.tsx";
import {SzAddresseeDecisionPanel} from "@/components/sz/SzAddresseeDecisionPanel.tsx";
import {useSzCard} from "@/hooks/sz/useSzCard.ts";
import {useSzApproval} from "@/hooks/sz/useSzApproval.ts";
import {useSzUsers} from "@/hooks/sz/useSzUsers.ts";
import {SzCardHeader} from "@/components/componentsSzCard/SzCardHeader.tsx";
import {SzCardNotices, SzWithdrawnBanner} from "@/components/componentsSzCard/SzCardNotices.tsx";
import {SzForceStatusPanel} from "@/components/componentsSzCard/SzForceStatusPanel.tsx";
import {SzWithdrawPanel} from "@/components/componentsSzCard/SzWithdrawPanel.tsx";
import {SzMainForm} from "@/components/componentsSzCard/SzMainForm.tsx";
import {SzRegistrationInfo} from "@/components/componentsSzCard/SzRegistrationInfo.tsx";
import {SzStatusPanels} from "@/components/componentsSzCard/SzStatusPanels.tsx";
import {SzApprovalSection} from "@/components/componentsSzCard/SzApprovalSection.tsx";

export function SzCardPage() {
    const {t} = useTranslation();
    const {id} = useParams<{ id: string }>();
    const {user} = useAuth();
    const {users, userList} = useSzUsers();

    const card = useSzCard(id);
    const {sz, route, form, formKey, isNew, editable, saving, notice, error} = card;
    const approval = useSzApproval({
        route,
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
            <SzCardHeader
                card={card}
                onToggleWithdraw={() => setWithdrawOpen((v) => !v)}
                onToggleForce={() => setForceOpen((v) => !v)}
            />

            <SzCardNotices notice={notice} error={error}/>

            {forceOpen && (
                <SzForceStatusPanel
                    saving={saving}
                    onSubmit={card.forceStatus}
                    onDone={() => setForceOpen(false)}
                />
            )}

            {withdrawOpen && (
                <SzWithdrawPanel
                    saving={saving}
                    onSubmit={card.withdraw}
                    onClose={() => setWithdrawOpen(false)}
                />
            )}

            {sz?.withdrawReason && sz.statusCode === "Draft" && (
                <SzWithdrawnBanner text={t("szCard.withdraw.banner", {reason: sz.withdrawReason})}/>
            )}

            {isNew && (
                <SzTemplateBar
                    form={form}
                    disabled={!editable}
                    onApply={(patch) => card.setForm((f) => ({...f, ...patch}))}
                />
            )}

            {isNew && <SzDuplicateWarning kindId={form.kindId} title={form.title}/>}

            <SzMainForm card={card} userList={userList}/>

            {sz && (
                <SzAddresseeDecisionPanel
                    sz={sz}
                    currentUserId={user?.id}
                    users={userList}
                    onDecided={card.applyDetails}
                />
            )}

            {sz && <SzRegistrationInfo sz={sz}/>}

            {sz && <SzStatusPanels sz={sz} formKey={formKey} onChanged={card.reload}/>}

            {!isNew && id && <SzTracePanel szId={Number(id)}/>}

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
        </div>
    );
}
