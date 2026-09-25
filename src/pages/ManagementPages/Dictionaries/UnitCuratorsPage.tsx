import {useEffect, useMemo, useState} from "react";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import {userService, type UserLookupItem} from "@/service/userService/userService.ts";
import {organizationUnitService} from "@/service/dictionariesService/organizationUnitService/organizationUnitService.ts";
import type {OrganizationUnitResponse} from "@/service/dictionariesService/organizationUnitService/organizationUnitServiceType.ts";
import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {PlainCheckbox} from "@/components/componentsGeneral/componentsCheckBox/PlainCheckbox.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {HighlightText} from "@/utils/highlightText.tsx";

/**
 * Кураторство подразделений (КСЗ-11): начальник и куратор (курирующий зампред) у каждого
 * узла оргструктуры. По ним маршрут кадровых СЗ подставляет согласующих ролями
 * author-head / author-curator. Портал заполняет их не для всех узлов — здесь УЧР
 * дозаполняет пробелы; синхронизация перезапишет только то, что портал сам присылает.
 */
export function UnitCuratorsPage() {
    const [users, setUsers] = useState<UserLookupItem[]>([]);
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
                setUsers(list);
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
        <div             className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                // title="Типы документов"
                title="Кураторство подразделений"
                // description="Свои виды документов: поля карточки и маршрут согласования — без программирования"
                description=" Начальник и куратор (курирующий зампред) у каждого подразделения. По ним маршрут
                кадровых СЗ находит согласующих. Портал заполняет их не везде — дозаполните пробелы здесь."
            />

            <div className="mt-4 flex items-center gap-3 flex-wrap">
                <SearchBar
                    placeholder="Поиск подразделения…"
                    value={query}
                    onChange={setQuery}
                />
                <PlainCheckbox checked={onlyEmpty} onChange={setOnlyEmpty}>
                    Только с пробелами
                </PlainCheckbox>
                <span className="text-[12.5px] text-[#8b97ab]">Показано {shown.length} из {units.length}</span>
            </div>

            {loading ? (
                <Loader label="Загрузка"/>
            ) : (
                <div className="mt-4 flex flex-col gap-2.5">
                    {shown.map((u) => (
                        <div key={u.id} className="rounded-[12px] border border-[#e5e9f0] bg-white p-3.5">
                            <div className="text-[13.5px] font-semibold text-[#0f1b2d] mb-2.5">
                                <HighlightText text={u.titleRu} query={query}/>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div>
                                    <div className="text-[11.5px] text-[#8b97ab] mb-1">Начальник</div>
                                    <UserPickerField
                                        people={users}
                                        value={edited[u.id]?.head ?? null}
                                        clearable
                                        placeholder="Найти сотрудника"
                                        modalTitle="Начальник"
                                        searchPlaceholder="Поиск по ФИО"
                                        onChange={(id) => change(u.id, "head", id)}
                                        onClear={() => change(u.id, "head", null)}
                                    />
                                </div>
                                <div>
                                    <div className="text-[11.5px] text-[#8b97ab] mb-1">Куратор (курир. зампред)</div>
                                    <UserPickerField
                                        people={users}
                                        value={edited[u.id]?.curator ?? null}
                                        clearable
                                        placeholder="Найти сотрудника"
                                        modalTitle="Куратор (курирующий зампред)"
                                        searchPlaceholder="Поиск по ФИО"
                                        onChange={(id) => change(u.id, "curator", id)}
                                        onClear={() => change(u.id, "curator", null)}
                                    />
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
