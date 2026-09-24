import {useEffect, useMemo, useState} from "react";
import {Link} from "react-router-dom";
import {UserPicker, type PickableUser} from "@/components/componentsGeneral/userPicker/UserPicker.tsx";
import {userService} from "@/service/userService/userService.ts";
import {organizationUnitService} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";

/**
 * Кураторство подразделений (КСЗ-11): начальник и куратор (курирующий зампред) у каждого
 * узла оргструктуры. По ним маршрут кадровых СЗ подставляет согласующих ролями
 * author-head / author-curator. Портал заполняет их не для всех узлов — здесь УЧР
 * дозаполняет пробелы; синхронизация перезапишет только то, что портал сам присылает.
 */
export function UnitCuratorsPage() {
    const [users, setUsers] = useState<PickableUser[]>([]);
    const [units, setUnits] = useState<OrganizationUnitResponse[]>([]);
    const [edited, setEdited] = useState<Record<number, {head: number | null; curator: number | null}>>({});
    const [savingId, setSavingId] = useState<number | null>(null);
    const [savedId, setSavedId] = useState<number | null>(null);
    const [errorId, setErrorId] = useState<{id: number; msg: string} | null>(null);
    const [query, setQuery] = useState("");
    const [onlyEmpty, setOnlyEmpty] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([userService.lookup(), organizationUnitService.getAll()])
            .then(([list, u]) => {
                setUsers(list.map((x) => ({
                    id: x.id, fullName: x.fullName,
                    position: x.position ?? null, orgUnit: x.orgUnit ?? null,
                    orgUnitId: x.orgUnitId ?? null,
                    isBoardMember: x.isBoardMember ?? false, isUnitHead: x.isUnitHead ?? false,
                })));
                setUnits(u);
                setEdited(Object.fromEntries(u.map((it) => [it.id, {head: it.headUserId, curator: it.curatorUserId}])));
            })
            .finally(() => setLoading(false));
    }, []);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return units
            .filter((u) => !q || u.titleRu.toLowerCase().includes(q))
            .filter((u) => !onlyEmpty || !edited[u.id]?.head || !edited[u.id]?.curator)
            .sort((a, b) => a.titleRu.localeCompare(b.titleRu, "ru"));
    }, [units, query, onlyEmpty, edited]);

    function change(id: number, field: "head" | "curator", value: number | null) {
        setEdited((e) => ({...e, [id]: {...e[id], [field]: value}}));
        setSavedId(null);
        setErrorId(null);
    }

    async function save(u: OrganizationUnitResponse) {
        const row = edited[u.id];
        setSavingId(u.id);
        setSavedId(null);
        setErrorId(null);
        try {
            await organizationUnitService.update(u.id, {
                titleRu: u.titleRu,
                titleEn: u.titleEn ?? undefined,
                titleKg: u.titleKg ?? undefined,
                parentId: u.parentId,
                headUserId: row.head,
                curatorUserId: row.curator,
            });
            setUnits((list) => list.map((it) => it.id === u.id
                ? {...it, headUserId: row.head, curatorUserId: row.curator} : it));
            setSavedId(u.id);
        } catch (e) {
            const msg = (e as {response?: {data?: {message?: string}}})?.response?.data?.message;
            setErrorId({id: u.id, msg: msg || "Не удалось сохранить"});
        } finally {
            setSavingId(null);
        }
    }

    const dirty = (id: number) =>
        edited[id]?.head !== units.find((u) => u.id === id)?.headUserId
        || edited[id]?.curator !== units.find((u) => u.id === id)?.curatorUserId;

    return (
        <div className="w-full max-w-[1100px] px-4 sm:px-6 pt-5 pb-12">
            <Link to="/management/refs" className="text-[13px] text-[#2f68f5] no-underline hover:underline">← Справочники</Link>
            <h1 className="mt-2 mb-0 text-[19px] font-bold text-[#0f1b2d]">Кураторство подразделений</h1>
            <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                Начальник и куратор (курирующий зампред) у каждого подразделения. По ним маршрут
                кадровых СЗ находит согласующих. Портал заполняет их не везде — дозаполните пробелы здесь.
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
                <input
                    className="h-9 flex-1 min-w-[240px] px-3 rounded-[9px] border border-[#e5e9f0] text-[13px] outline-none focus:border-[#2f68f5]"
                    placeholder="Поиск подразделения…" value={query} onChange={(e) => setQuery(e.target.value)}
                />
                <label className="flex items-center gap-1.5 text-[13px] text-[#55617a] cursor-pointer">
                    <input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)}/>
                    Только с пробелами
                </label>
                <span className="text-[12.5px] text-[#8b97ab]">Показано {shown.length} из {units.length}</span>
            </div>

            {loading ? (
                <div className="mt-5 text-[13px] text-[#8b97ab]">Загрузка…</div>
            ) : (
                <div className="mt-4 flex flex-col gap-2.5">
                    {shown.map((u) => (
                        <div key={u.id} className="rounded-[12px] border border-[#e5e9f0] bg-white p-3.5">
                            <div className="text-[13.5px] font-semibold text-[#0f1b2d] mb-2.5">{u.titleRu}</div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-[11.5px] text-[#8b97ab] mb-1">Начальник</div>
                                    <UserPicker users={users} value={edited[u.id]?.head ?? null} clearable bySeniority
                                                placeholder="Найти сотрудника"
                                                onChange={(x) => change(u.id, "head", x?.id ?? null)}/>
                                </div>
                                <div>
                                    <div className="text-[11.5px] text-[#8b97ab] mb-1">Куратор (курир. зампред)</div>
                                    <UserPicker users={users} value={edited[u.id]?.curator ?? null} clearable bySeniority
                                                placeholder="Найти сотрудника"
                                                onChange={(x) => change(u.id, "curator", x?.id ?? null)}/>
                                </div>
                            </div>
                            <div className="mt-2.5 flex items-center gap-3">
                                <button type="button" onClick={() => void save(u)}
                                        disabled={savingId === u.id || !dirty(u.id)}
                                        className="h-8 px-3.5 rounded-[8px] bg-[#2f68f5] text-white text-[12.5px] font-semibold cursor-pointer hover:bg-[#2554cc] disabled:opacity-40 disabled:cursor-default">
                                    {savingId === u.id ? "Сохраняем…" : "Сохранить"}
                                </button>
                                {savedId === u.id && <span className="text-[12.5px] text-[#1c7a4d]">Сохранено</span>}
                                {errorId?.id === u.id && <span className="text-[12.5px] text-[#c0392b]">{errorId.msg}</span>}
                            </div>
                        </div>
                    ))}
                    {shown.length === 0 && <div className="text-[13px] text-[#8b97ab] py-6 text-center">Ничего не найдено.</div>}
                </div>
            )}
        </div>
    );
}
