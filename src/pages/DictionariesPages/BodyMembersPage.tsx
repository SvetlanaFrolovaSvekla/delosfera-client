import {useCallback, useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {Trash2} from "lucide-react";
import {useAuth} from "@/context/AuthContext.ts";
import {PermissionCode} from "@/constants/permissions/permissions.ts";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/UserPicker.tsx";
import {userService} from "@/service/userService/userService.ts";
import {
    BODY_ROLE_TITLE, BODY_TITLE, bodyMemberService,
    type BodyMember, type BodyRoleCode, type MeetingBodyCode,
} from "@/service/meetingsService/bodyMemberService.ts";

/**
 * Состав коллегиальных органов.
 *
 * Кто входит в Правление, КПА и Кредитный комитет — и кем: председателем, членом
 * или секретарём. Отдельная настройка, а не права роли: банк меняет состав
 * решением, и перенастройка доступа тут ни при чём.
 */

const BODIES: MeetingBodyCode[] = ["Board", "Kpa", "CreditCommittee"];
const ROLES: BodyRoleCode[] = ["Chairman", "Member", "Secretary"];

const input = "h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] outline-none " +
    "focus:border-[#2f68f5]";

export function BodyMembersPage() {
    const {hasPermission} = useAuth();
    const canEdit = hasPermission(PermissionCode.ManageSystemSettings);

    const [body, setBody] = useState<MeetingBodyCode>("Board");
    const [rows, setRows] = useState<BodyMember[]>([]);
    const [users, setUsers] = useState<PickableUser[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [newUser, setNewUser] = useState<PickableUser | null>(null);
    const [newRole, setNewRole] = useState<BodyRoleCode>("Member");
    const [basis, setBasis] = useState("");

    const load = useCallback(async () => {
        try {
            setRows(await bodyMemberService.list(body));
            setError(null);
        } catch {
            setError("Не удалось загрузить состав органа");
        }
    }, [body]);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => { userService.lookup().then(setUsers).catch(() => setUsers([])); }, []);

    /** Уже в составе — второй раз того же человека не предлагаем. */
    const свободные = useMemo(
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

    return (
        <div className="p-[22px_26px] flex flex-col gap-4 max-w-[1000px]">
            <div>
                <div className="text-[12.5px] text-[#8b97ab]">
                    <Link to="/management/refs" className="text-[#8b97ab] no-underline">Справочники</Link>
                    {" · Состав коллегиальных органов"}
                </div>
                <h1 className="m-[4px_0_0] text-[19px] font-bold text-[#0f1b2d]">
                    Состав коллегиальных органов
                </h1>
                <p className="mt-1.5 mb-0 text-[13px] text-[#55617a] max-w-[70ch]">
                    Кто входит в орган и кем. По этому списку собирается поле «Кому» у записки,
                    рассылаются уведомления о заседании и считается явка. Права доступа задаются
                    отдельно — здесь только состав.
                </p>
            </div>

            <div className="flex gap-2">
                {BODIES.map(b => (
                    <button
                        key={b}
                        onClick={() => setBody(b)}
                        className={`h-9 px-4 rounded-[9px] text-[13px] font-semibold cursor-pointer border ${
                            b === body
                                ? "border-[#2f68f5] bg-[#eef3ff] text-[#2f68f5]"
                                : "border-[#e5e9f0] bg-white text-[#55617a] hover:bg-[#f6f8fb]"
                        }`}
                    >
                        {BODY_TITLE[b]}
                    </button>
                ))}
            </div>

            {error && (
                <div className="rounded-[9px] border border-[#f0d3d3] bg-[#fdf3f3] px-4 py-2.5 text-[13px] text-[#a94442]">
                    {error}
                </div>
            )}

            <section className="rounded-[12px] border border-[#e5e9f0] bg-white overflow-hidden">
                {rows.length === 0 ? (
                    <div className="p-5 text-[13px] text-[#8b97ab]">
                        Состав не заведён. Пока он пуст, уведомления о заседании расходятся по прежнему
                        признаку в правах ролей.
                    </div>
                ) : (
                    <table className="w-full border-collapse text-[13.5px]">
                        <thead>
                            <tr>
                                <th className="text-left p-[10px_14px] text-[11px] font-semibold uppercase tracking-[.08em] text-[#a3adbd] border-b border-[#eef1f6]">Кто</th>
                                <th className="text-left p-[10px_14px] text-[11px] font-semibold uppercase tracking-[.08em] text-[#a3adbd] border-b border-[#eef1f6]">Роль в органе</th>
                                <th className="text-left p-[10px_14px] text-[11px] font-semibold uppercase tracking-[.08em] text-[#a3adbd] border-b border-[#eef1f6]">Основание</th>
                                {canEdit && <th className="border-b border-[#eef1f6] w-10"/>}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => (
                                <tr key={r.id} className={r.isCurrent ? "" : "opacity-55"}>
                                    <td className="p-[11px_14px] border-b border-[#f4f6f9] align-top">
                                        <div className="text-[#0f1b2d]">{r.userName}</div>
                                        <div className="text-[12px] text-[#8b97ab]">
                                            {r.position ?? "должность не указана"}
                                            {r.orgUnit && ` · ${r.orgUnit}`}
                                        </div>
                                    </td>
                                    <td className="p-[11px_14px] border-b border-[#f4f6f9] align-top">
                                        {canEdit ? (
                                            <select
                                                value={r.role}
                                                disabled={busy}
                                                onChange={e => void run(
                                                    () => bodyMemberService.update(r.id, {
                                                        role: e.target.value as BodyRoleCode,
                                                        from: r.from, to: r.to, basis: r.basis,
                                                    }),
                                                    "Не удалось изменить роль",
                                                )}
                                                className={input}
                                            >
                                                {ROLES.map(role => (
                                                    <option key={role} value={role}>{BODY_ROLE_TITLE[role]}</option>
                                                ))}
                                            </select>
                                        ) : r.roleTitle}
                                    </td>
                                    <td className="p-[11px_14px] border-b border-[#f4f6f9] align-top text-[#55617a]">
                                        {r.basis ?? "—"}
                                        {!r.isCurrent && (
                                            <div className="text-[12px] text-[#8b97ab]">выведен из состава</div>
                                        )}
                                    </td>
                                    {canEdit && (
                                        <td className="p-[11px_14px] border-b border-[#f4f6f9] align-top">
                                            <button
                                                title="Вывести из состава"
                                                disabled={busy}
                                                onClick={() => void run(
                                                    () => bodyMemberService.remove(r.id),
                                                    "Не удалось вывести из состава",
                                                )}
                                                className="grid h-8 w-8 place-items-center rounded-[8px] border border-[#e5e9f0] bg-white cursor-pointer text-[#a94442] hover:bg-[#fdf3f3]"
                                            >
                                                <Trash2 size={15}/>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {canEdit && (
                <section className="rounded-[12px] border border-[#e5e9f0] bg-white p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[.04em] text-[#a3adbd] mb-3">
                        Ввести в состав {BODY_TITLE[body]}
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[260px] flex-1">
                            <div className="text-[12px] text-[#8b97ab] mb-1">Сотрудник</div>
                            <UserPicker users={свободные} value={newUser?.id ?? null} onChange={setNewUser}/>
                        </div>

                        <div>
                            <div className="text-[12px] text-[#8b97ab] mb-1">Роль в органе</div>
                            <select
                                value={newRole}
                                onChange={e => setNewRole(e.target.value as BodyRoleCode)}
                                className={input}
                            >
                                {ROLES.map(role => (
                                    <option key={role} value={role}>{BODY_ROLE_TITLE[role]}</option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-[240px] flex-1">
                            <div className="text-[12px] text-[#8b97ab] mb-1">Основание</div>
                            <input
                                value={basis}
                                onChange={e => setBasis(e.target.value)}
                                placeholder="Протокол, приказ, решение собрания"
                                className={`${input} w-full`}
                            />
                        </div>

                        <button
                            disabled={busy || !newUser}
                            onClick={() => void run(async () => {
                                await bodyMemberService.add({
                                    body,
                                    userId: newUser!.id,
                                    role: newRole,
                                    basis: basis.trim() || null,
                                });
                                setNewUser(null);
                                setNewRole("Member");
                                setBasis("");
                            }, "Не удалось ввести в состав")}
                            className="h-9 px-4 rounded-[9px] border-none bg-[#2f68f5] text-white text-[13px] font-semibold cursor-pointer hover:brightness-[1.06] disabled:opacity-50"
                        >
                            Ввести в состав
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
