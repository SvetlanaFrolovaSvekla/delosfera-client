/**
 * Состав коллегиальных органов.
 *
 * Кто входит в Правление, КПА и Кредитный комитет — и кем: председателем, членом
 * или секретарём. Отдельная настройка, а не права роли: банк меняет состав
 * решением, и перенастройка доступа тут ни при чём.
 */
import {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {ArrowLeft, Landmark, Plus, Trash2} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";
import {EmptyState} from "@/components/componentsGeneral/emptyPanel/EmptyState.tsx";
import {Tooltip} from "@/components/componentsGeneral/tooltips/Tooltip.tsx";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {
    bodyMemberService,
    type BodyMember, type BodyRoleCode, type MeetingBodyCode,
} from "@/service/meetingsService/bodyMemberService.ts";


const BODIES: MeetingBodyCode[] = ["Board", "Kpa", "CreditCommittee"];
const ROLES: BodyRoleCode[] = ["Chairman", "Member", "Secretary"];

const FIELD_LABEL = "text-[11.5px] text-[#8b97ab] mb-1.5";
const TEXT_INPUT = "h-9 w-full rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none " +
    "focus:border-[#4e57d6]";
const COLUMN_HEAD = "whitespace-nowrap";

export function BodyMembersPage() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {hasPermission} = useAuth();
    const canEdit = hasPermission(PermissionCode.ManageSystemSettings);

    const [body, setBody] = useState<MeetingBodyCode>("Board");
    const [rows, setRows] = useState<BodyMember[]>([]);
    const [users, setUsers] = useState<UserLookupItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [newUserId, setNewUserId] = useState<number | null>(null);
    const [newRole, setNewRole] = useState<BodyRoleCode>("Member");
    const [basis, setBasis] = useState("");

    const load = useCallback(async () => {
        try {
            setRows(await bodyMemberService.list(body));
            setError(null);
        } catch {
            setError(t("bodyMembersPage.errorLoad") /* Не удалось загрузить состав органа */);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [body]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => { userService.lookup().then(setUsers).catch(() => setUsers([])); }, []);

    /** Уже в составе — второй раз того же человека не предлагаем. */
    const availableUsers = useMemo(
        () => users.filter(u => !rows.some(r => r.userId === u.id)),
        [users, rows],
    );

    const run = async (action: () => Promise<unknown>, fallback: string) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
        } catch (e) {
            const message = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setError(message ?? fallback);
        } finally {
            setBusy(false);
        }
    };

    const roleOptions = ROLES.map(role => ({value: role, label: t(`bodyMembersPage.roles.${role}`)}));
    const bodyTitle = t(`bodyMembersPage.bodies.${body}`);

    const gridTemplate = canEdit
        ? "minmax(220px,1fr) 210px minmax(200px,1fr) 44px"
        : "minmax(220px,1fr) 210px minmax(200px,1fr)";

    return (
        <div
            className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/management/refs")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                {t("dictionaries.navigateGeneral") /* Справочники · Общее */}
            </button>

            <div className="mb-4">
                <div className="flex items-center gap-2.5 mb-1">
                    <span
                        className="w-8 h-8 rounded-[9px] bg-[#eef0fd] text-[#4e57d6] grid place-items-center flex-none">
                        <Landmark className="w-[16px] h-[16px]" strokeWidth={1.8}/>
                    </span>
                    <h1 className="m-0 text-[19px] font-bold tracking-[-0.02em] text-[#1c2740]">
                        {t("bodyMembersPage.title") /* Состав коллегиальных органов */}
                    </h1>
                </div>
                <p className="mt-1.5 mb-0 text-[13px] text-[#8b97ab]">
                    {t("bodyMembersPage.description")}
                </p>
            </div>

            <Tabs<MeetingBodyCode>
                tabs={BODIES.map(b => ({id: b, label: t(`bodyMembersPage.bodies.${b}`)}))}
                value={body}
                onChange={setBody}
            />

            {error && (
                <div
                    className="mb-4 rounded-[9px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {rows.length === 0 ? (
                <EmptyState
                    variant="empty"
                    icon={Landmark}
                    title={t("bodyMembersPage.emptyTitle") /* Состав не заведён */}
                    description={t("bodyMembersPage.emptyDescription")}
                />
            ) : (
                <div className="bg-white border border-[#e9edf3] rounded-[14px]">
                    <div
                        className="grid gap-3 px-5 py-3 border-b border-[#eef2f7] bg-[#fafbfd] rounded-t-[14px] text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd]"
                        style={{gridTemplateColumns: gridTemplate}}
                    >
                        <div className={COLUMN_HEAD}>{t("bodyMembersPage.columnWho") /* Кто */}</div>
                        <div className={COLUMN_HEAD}>{t("bodyMembersPage.columnRole") /* Роль в органе */}</div>
                        <div className={COLUMN_HEAD}>{t("bodyMembersPage.columnBasis") /* Основание */}</div>
                        {canEdit && <div/>}
                    </div>

                    {rows.map((r, index) => (
                        <div
                            key={r.id}
                            className={`grid gap-3 items-center px-5 py-3 hover:bg-[#fbfcfe] transition ${
                                r.isCurrent ? "" : "opacity-55"
                            } ${index === rows.length - 1 ? "rounded-b-[14px]" : "border-b border-[#f3f6f9]"}`}
                            style={{gridTemplateColumns: gridTemplate}}
                        >
                            <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[#1c2740] truncate">{r.userName}</div>
                                <div className="text-[11.5px] text-[#8b97ab] truncate">
                                    {r.position ?? t("bodyMembersPage.noPosition") /* должность не указана */}
                                    {r.orgUnit && ` · ${r.orgUnit}`}
                                </div>
                            </div>

                            <div>
                                {canEdit ? (
                                    <SelectDropdown
                                        options={roleOptions}
                                        value={r.role}
                                        minWidth="170px"
                                        onChange={(role) => {
                                            if (busy || role === r.role) return;
                                            void run(
                                                () => bodyMemberService.update(r.id, {
                                                    role: role as BodyRoleCode,
                                                    from: r.from, to: r.to, basis: r.basis,
                                                }),
                                                t("bodyMembersPage.errorChangeRole") /* Не удалось изменить роль */,
                                            );
                                        }}
                                    />
                                ) : (
                                    <span className="text-[13px] text-[#26324a]">
                                        {t(`bodyMembersPage.roles.${r.role}`)}
                                    </span>
                                )}
                            </div>

                            <div className="min-w-0 text-[13px] text-[#55617a]">
                                {r.basis ?? "—"}
                                {!r.isCurrent && (
                                    <div className="text-[11.5px] text-[#8b97ab]">
                                        {t("bodyMembersPage.removedFromBody") /* выведен из состава */}
                                    </div>
                                )}
                            </div>

                            {canEdit && (
                                <div className="flex justify-end">
                                    <Tooltip content={t("bodyMembersPage.removeTooltip") /* Вывести из состава */}
                                             side="top">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void run(
                                                () => bodyMemberService.remove(r.id),
                                                t("bodyMembersPage.errorRemove") /* Не удалось вывести из состава */,
                                            )}
                                            className="w-7 h-7 grid place-items-center rounded-md bg-[#fdeceb] text-[#c0392b] cursor-pointer transition-colors hover:bg-[#fad9d7] hover:text-[#a52d21] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="w-[13px] h-[13px]" strokeWidth={2}/>
                                        </button>
                                    </Tooltip>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canEdit && (
                <section className="mt-4 bg-white border border-[#e9edf3] rounded-[14px] p-[22px]">
                    <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-3">
                        {t("bodyMembersPage.addTitle", {body: bodyTitle}) /* Ввести в состав {орган} */}
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[260px] flex-1">
                            <div className={FIELD_LABEL}>{t("bodyMembersPage.fieldEmployee") /* Сотрудник */}</div>
                            <UserPickerField
                                compact
                                people={availableUsers}
                                value={newUserId}
                                onChange={setNewUserId}
                                placeholder={t("bodyMembersPage.employeePlaceholder") /* Найти сотрудника */}
                                modalTitle={t("bodyMembersPage.fieldEmployee") /* Сотрудник */}
                                searchPlaceholder={t("bodyMembersPage.employeeSearch") /* Поиск по ФИО */}
                            />
                        </div>

                        <div>
                            <div className={FIELD_LABEL}>{t("bodyMembersPage.columnRole") /* Роль в органе */}</div>
                            <SelectDropdown
                                options={roleOptions}
                                value={newRole}
                                onChange={(role) => setNewRole(role as BodyRoleCode)}
                                minWidth="190px"
                            />
                        </div>

                        <div className="min-w-[240px] flex-1">
                            <div className={FIELD_LABEL}>{t("bodyMembersPage.columnBasis") /* Основание */}</div>
                            <input
                                value={basis}
                                onChange={e => setBasis(e.target.value)}
                                placeholder={t("bodyMembersPage.basisPlaceholder") /* Протокол, приказ, решение собрания */}
                                className={TEXT_INPUT}
                            />
                        </div>

                        <button
                            type="button"
                            disabled={busy || newUserId === null}
                            onClick={() => void run(async () => {
                                await bodyMemberService.add({
                                    body,
                                    userId: newUserId!,
                                    role: newRole,
                                    basis: basis.trim() || null,
                                });
                                setNewUserId(null);
                                setNewRole("Member");
                                setBasis("");
                            }, t("bodyMembersPage.errorAdd") /* Не удалось ввести в состав */)}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-[15px] h-[15px]" strokeWidth={2.2}/>
                            {t("bodyMembersPage.add") /* Ввести в состав */}
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
