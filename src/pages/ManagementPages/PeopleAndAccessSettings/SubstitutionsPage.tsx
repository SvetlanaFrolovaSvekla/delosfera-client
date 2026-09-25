/**
 * Замещения (GEN-14).
 *
 * Пока сотрудник в отпуске или на больничном, его задачи должен кто-то закрывать —
 * иначе согласование встаёт до его возвращения. Замещающий выносит резолюции от
 * своего имени, но по задачам замещаемого: движок это уже учитывает, а управлять
 * замещениями было негде.
 *
 * Отменённые из списка не пропадают: важно, кто и в какие дни имел право решать
 * за другого, — задним числом это восстановить неоткуда.
 */
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    substitutionService,
    type Substitution,
} from "@/service/dashboardService/dashboardService.ts";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {toast} from "@/service/toastService.ts";
import {SubstitutionCreateForm, type SubstitutionFormState} from "@/components/componentsSubstitutions/SubstitutionCreateForm.tsx";
import {SubstitutionsTable} from "@/components/componentsSubstitutions/SubstitutionsTable.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";


type PersonOption = UserLookupItem;

const today = () => new Date().toISOString().slice(0, 10);

export function SubstitutionsPage() {
    const {t} = useTranslation();
    const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
    const [people, setPeople] = useState<PersonOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [showCancelled, setShowCancelled] = useState(false);

    const [form, setForm] = useState<SubstitutionFormState>({
        userId: 0,
        substituteUserId: 0,
        startsOn: today(),
        endsOn: today(),
        reason: "",
    });

    const load = useCallback(async () => {
        try {
            setSubstitutions(await substitutionService.list(false));
        } catch {
            setError(t("substitutions.errorLoad") /* Не удалось загрузить замещения */);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        userService.lookup()
            .then(setPeople)
            .catch(() => undefined);
    }, [load]);

    const visible = useMemo(
        () => (showCancelled ? substitutions : substitutions.filter((s) => !s.isCancelled)),
        [substitutions, showCancelled],
    );

    const formIssue = (() => {
        if (!form.userId || !form.substituteUserId) return t("substitutions.issueSelectBoth") /* Выберите, кого и кто замещает */;
        if (form.userId === form.substituteUserId) return t("substitutions.issueSameUser") /* Человек не может замещать сам себя */;
        if (form.endsOn < form.startsOn) return t("substitutions.issueEndBeforeStart") /* Дата окончания раньше даты начала */;
        return null;
    })();

    const create = async () => {
        if (formIssue) return;
        try {
            setBusy(true);
            setError(null);
            await substitutionService.create({
                userId: form.userId,
                substituteUserId: form.substituteUserId,
                startsOn: form.startsOn,
                endsOn: form.endsOn,
                reason: form.reason.trim() || undefined,
            });
            setForm({...form, userId: 0, substituteUserId: 0, reason: ""});
            await load();
            // Форма очищается сразу и молча — без всплывающего подтверждения оформление
            // выглядело так, будто ничего не произошло.
            toast.success(t("substitutions.toastCreatedTitle") /* Замещение оформлено */);
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            const description = message ?? t("substitutions.errorCreate") /* Не удалось оформить замещение */;
            setError(description);
            toast.error(t("substitutions.toastCreateErrorTitle") /* Не удалось оформить */, description);
        } finally {
            setBusy(false);
        }
    };

    const cancel = async (s: Substitution) => {
        if (!window.confirm(
            t("substitutions.confirmCancel", {
                substitute: s.substituteUserName,
                user: s.userName,
            }) /* `Отменить замещение? ${s.substituteUserName} перестанет видеть задачи ${s.userName} с этой минуты.` */
        )) return;
        try {
            setBusy(true);
            setError(null);
            await substitutionService.cancel(s.id);
            await load();
        } catch {
            setError(t("substitutions.errorCancel") /* Не удалось отменить замещение */);
        } finally {
            setBusy(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col gap-4 p-[22px_26px] max-w-[1080px]">
            <Loader label={t("general.loading")}/>
        </div>
    );

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">

            <PageHeader
                title={t("substitutions.pageTitle") /* Замещения */}
                description={t("substitutions.pageDescription") /* Пока сотрудник в отпуске или на больничном, замещающий видит его задачи согласования и выносит по ним решения от своего имени. Замещение действует только в указанные дни. */}
            />

            {error && (
                <div className="rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            <SubstitutionCreateForm
                people={people}
                form={form}
                onChange={setForm}
                formIssue={formIssue}
                busy={busy}
                onSubmit={create}
            />

            <SubstitutionsTable
                substitutions={visible}
                showCancelled={showCancelled}
                onShowCancelledChange={setShowCancelled}
                busy={busy}
                onCancel={cancel}
            />
        </div>
    );
}