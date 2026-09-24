import {useEffect, useState} from "react";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {userService} from "@/service/userService/userService.ts";
import {hrRoutingService} from "@/service/szService/hrRoutingService.ts";

/**
 * Маршрутизация кадровых СЗ (КСЗ-04..06, КСЗ-12): кто кадровик УЧР по областям.
 * Автор из филиальной сети → УЧР по филиалам, иначе → УЧР по Головному офису.
 * Эти люди подставляются в маршрут ролью «Кадровик УЧР» автоматически.
 */
export function HrRoutingSettingsPage() {
    const [users, setUsers] = useState<PickableUser[]>([]);
    const [headOffice, setHeadOffice] = useState<number | null>(null);
    const [branch, setBranch] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([userService.lookup(), hrRoutingService.get()])
            .then(([list, s]) => {
                setUsers(list.map((u) => ({
                    id: u.id, fullName: u.fullName,
                    position: u.position ?? null, orgUnit: u.orgUnit ?? null,
                    orgUnitId: u.orgUnitId ?? null,
                    isBoardMember: u.isBoardMember ?? false,
                    isUnitHead: u.isUnitHead ?? false,
                })));
                setHeadOffice(s.headOfficeHrUserId);
                setBranch(s.branchHrUserId);
            })
            .catch(() => setError("Не удалось загрузить настройки"))
            .finally(() => setLoading(false));
    }, []);

    async function save() {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            await hrRoutingService.set({headOfficeHrUserId: headOffice, branchHrUserId: branch});
            setSaved(true);
        } catch {
            setError("Не удалось сохранить");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="w-full max-w-[720px] px-4 sm:px-6 pt-5 pb-12">
            <h1 className="m-0 text-[19px] font-bold text-[#0f1b2d]">Маршрутизация кадровых СЗ</h1>
            <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                Кто выступает кадровиком УЧР в маршруте кадровых записок — по области автора.
                Автор из филиальной сети направляется на УЧР по филиалам, иначе — на УЧР по Головному офису.
            </div>

            {error && <div className="mt-4 text-[13px] text-[#c0392b]">{error}</div>}
            {loading ? (
                <div className="mt-5 text-[13px] text-[#8b97ab]">Загрузка…</div>
            ) : (
                <div className="mt-5 flex flex-col gap-5">
                    <Field
                        label="Кадровик УЧР по Головному офису"
                        hint="Согласует и исполняет кадровые СЗ авторов Головного офиса.">
                        <UserPicker
                            users={users}
                            value={headOffice}
                            clearable
                            bySeniority
                            placeholder="Найти по фамилии, должности или подразделению"
                            onChange={(u) => { setHeadOffice(u?.id ?? null); setSaved(false); }}
                        />
                    </Field>

                    <Field
                        label="Кадровик УЧР по филиальной сети"
                        hint="Согласует и исполняет кадровые СЗ авторов из филиалов.">
                        <UserPicker
                            users={users}
                            value={branch}
                            clearable
                            bySeniority
                            placeholder="Найти по фамилии, должности или подразделению"
                            onChange={(u) => { setBranch(u?.id ?? null); setSaved(false); }}
                        />
                    </Field>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void save()}
                            disabled={saving}
                            className="h-10 px-5 rounded-[10px] bg-[#2f68f5] text-white text-[14px] font-semibold cursor-pointer hover:bg-[#2554cc] disabled:opacity-50"
                        >
                            {saving ? "Сохраняем…" : "Сохранить"}
                        </button>
                        {saved && <span className="text-[13px] text-[#1c7a4d]">Сохранено</span>}
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({label, hint, children}: {label: string; hint: string; children: React.ReactNode}) {
    return (
        <div className="rounded-[13px] border border-[#e5e9f0] bg-white p-4">
            <div className="text-[14px] font-semibold text-[#0f1b2d]">{label}</div>
            <div className="mt-0.5 mb-3 text-[12px] text-[#8b97ab]">{hint}</div>
            {children}
        </div>
    );
}
