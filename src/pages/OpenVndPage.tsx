import {useNavigate, useParams} from "react-router-dom";
import {useState} from "react";
import {ArrowLeft} from "lucide-react";
import {useVndById} from "@/hooks/useVndById.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import {VndStatusBanner} from "@/components/componentsGeneral/VndStatusBanner.tsx";
import {
    keywordNames,
    responsibleExecutorNames,
    rubricNames,
    secrecyLevelName,
    userGroupNames,
} from "@/utils/vndDictionaryResolvers.ts";

const fieldBoxClass =
    "w-full min-h-10 px-3 py-2 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#1c2740] flex items-center box-border";

const VND_TABS = [
    {id: "passport", label: "Реквизиты"},
    {id: "editions", label: "Редакции"},
    {id: "actual", label: "Актуализация"},
    {id: "links", label: "Связи и история"},
] as const;

type VndTabId = (typeof VND_TABS)[number]["id"];

// Сервер отдаёт даты как "YYYY-MM-DD" / datetime как ISO-строку — приводим к дд.мм.гггг
function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const [y, m, d] = iso.slice(0, 10).split("-");
    if (!y || !m || !d) return "—";
    return `${d}.${m}.${y}`;
}

// Приблизительная периодичность, выведенная из разницы между последней
// и плановой актуализацией (сам выбранный период бэк не хранит отдельно).
function describePeriod(fromISO: string | null | undefined, toISO: string | null | undefined): string {
    if (!fromISO || !toISO) return "—";
    const from = new Date(fromISO);
    const to = new Date(toISO);
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return "—";

    const approxMonths = days / 30.44;
    const buckets = [
        {months: 3, label: "раз в квартал"},
        {months: 6, label: "раз в полгода"},
        {months: 12, label: "раз в год"},
        {months: 24, label: "раз в два года"},
        {months: 36, label: "раз в три года"},
    ];
    const closest = buckets.find((b) => Math.abs(approxMonths - b.months) <= b.months * 0.1);
    if (closest) return closest.label;

    return approxMonths < 1 ? `${days} дн.` : `≈ ${Math.round(approxMonths)} мес.`;
}

export function OpenVndPage() {
    const {id} = useParams<{ id: string }>();
    const {data: vnd, loading, error} = useVndById(id ? Number(id) : undefined);
    const navigate = useNavigate();
    const [tab, setTab] = useState<VndTabId>("passport");

    if (loading) {
        return <div className="py-10 text-center text-[13px] text-[#8b97ab]">Загрузка…</div>;
    }

    if (error) {
        return (
            <div className="my-4 mx-auto max-w-[1000px] rounded-md border border-[#f2c2c2] bg-[#fdf1f1] px-4 py-3 text-[13px] text-[#c0392b]">
                Не удалось загрузить документ: {error}
            </div>
        );
    }

    if (!vnd) return null;

    const meta = STATUS_META[vnd.status];
    const isCancelledOrArchived = Boolean(vnd.cancelDate || vnd.archivedDate);
    const periodFrom = vnd.lastActualizationDate || vnd.effectiveDate || vnd.adoptionDate;
    const periodLabel = describePeriod(periodFrom, vnd.dueActualizationDate);

    return (
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <button
                onClick={() => navigate("/basevnd")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer p-0 mb-1 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                База ВНД
            </button>

            <div className="flex items-center gap-[9px] mb-1 flex-wrap mt-3">
                  <span className="font-mono text-[13px] font-semibold text-[#4e57d6] bg-[#ececfc] px-[10px] py-[3px] rounded-[7px]">
                    {vnd.code}
                </span>
                <span
                    className="inline-flex items-center text-[12px] font-semibold py-0.5 px-[9px] font-mono text-[12px] text-[#8b97ab]"
                >
                   Дата создания: {formatDate(vnd.createdAt)}
                </span>
                <span
                    className="inline-flex items-center text-[12px] font-semibold py-0.5 px-[9px] font-mono rounded-full"
                    style={{color: meta.color, background: meta.bg}}
                >
                    {meta.label}
                </span>
            </div>
            <h1 className="m-0 mb-1 text-[23px] font-bold tracking-[-0.02em]">
                {vnd.name}
            </h1>

            <VndStatusBanner status={vnd.status}/>

            {/* Табы */}
            <div className="flex items-center gap-6 border-b border-[#e9edf3] mb-5 overflow-x-auto">
                {VND_TABS.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`whitespace-nowrap pb-3 border-b-2 text-[13px] font-semibold cursor-pointer bg-transparent ${
                            tab === t.id
                                ? "border-[#4e57d6] text-[#4e57d6]"
                                : "border-transparent text-[#8b97ab] hover:text-[#3a4560]"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* TAB: Реквизиты (паспорт) */}
            {tab === "passport" && (
                <>
                <p className="mt-0 mb-[13px] text-[#8b97ab] text-[13px]">
                  Резквизиты данного черновика ВНД
                </p>

                <div className="bg-white border border-[#e9edf3] rounded-2xl px-6 py-[22px]">


                    <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
                        <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                            Основная информация
                        </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <ReadOnlyField label="Вид документа" value={vnd.typeName || "—"}/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <ReadOnlyField label="Орган утверждения" value={vnd.organName || "—"}/>
                        <ReadOnlyField
                            label="Ответственные исполнители"
                            value={responsibleExecutorNames(vnd.responsibleExecutorIds)}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <ReadOnlyField label="Разработчик (СП)" value={vnd.developerName || "—"}/>
                        <ReadOnlyField label="Куратор разработчика" value={vnd.curatorDeveloperName || "—"}/>
                    </div>
                    </div>

                    <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
                        <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                            Заголовки
                        </div>
                        <div className="flex flex-col gap-3">
                            <ReadOnlyField label="Заголовок (рус)" value={vnd.titleRu}/>
                            <ReadOnlyField label="Заголовок (кырг)" value={vnd.titleKg || "—"}/>
                            <ReadOnlyField label="Заголовок (англ)" value={vnd.titleEn || "—"}/>
                        </div>
                    </div>

                    {/* Принятие и вступление в силу */}
                    <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
                        <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                            Принятие и вступление в силу
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ReadOnlyField label="Дата принятия" value={formatDate(vnd.adoptionDate)}/>
                            <ReadOnlyField label="№ принятия" value={vnd.adoptionCode || "—"}/>
                            <ReadOnlyField label="Дата вступления в силу" value={formatDate(vnd.effectiveDate)}/>
                        </div>
                    </div>

                    {/* Изменения */}
                    <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
                        <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                            Изменения
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ReadOnlyField label="Изменение реквизитов" value={formatDate(vnd.requisitesChangedDate)}/>
                            <ReadOnlyField label="Изменение редакции" value={formatDate(vnd.revisionChangedDate)}/>
                        </div>
                    </div>

                    {/* Актуализация */}
                    <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
                        <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                            Актуализация
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ReadOnlyField label="Срок актуализации" value={formatDate(vnd.dueActualizationDate)}/>
                            <ReadOnlyField label="Дата посл. актуализации" value={formatDate(vnd.lastActualizationDate)}/>
                            <ReadOnlyField label="Период" value={periodLabel}/>
                            <ReadOnlyField
                                label="Была ли последняя актуализация с изменениями"
                                value={vnd.lastActualizationDate ? (vnd.lastActualizationHadChanges ? "Да" : "Нет") : "—"}
                            />
                        </div>
                    </div>

                    {/* Отмена и архивация */}
                    {isCancelledOrArchived && (
                        <div className="border border-[#eef2f7] rounded-xl p-3.5 mb-4">
                            <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                                Отмена и архивация
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <ReadOnlyField label="Дата отмены" value={formatDate(vnd.cancelDate)}/>
                                <ReadOnlyField label="№ отмены" value={vnd.cancelCode || "—"}/>
                                <ReadOnlyField label="Причина отмены" value={vnd.cancelReason || "—"}/>
                                <ReadOnlyField label="Дата архивации" value={formatDate(vnd.archivedDate)}/>
                                <ReadOnlyField label="Дней в архиве" value={vnd.archivedDate ? String(vnd.daysInArchive) : "—"}/>
                            </div>
                        </div>
                    )}

                    {/* Классификаторы — ниже дат */}
                    <div className="border border-[#eef2f7] rounded-xl p-3.5">
                        <div className="text-[11px] font-bold tracking-[.04em] uppercase text-[#a3adbd] mb-2.5">
                            Классификаторы
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ChipsField
                                label="Ключевые слова"
                                items={vnd.keywordIds.length ? keywordNames(vnd.keywordIds).split(", ") : []}
                            />
                            <ChipsField
                                label="Рубрикатор"
                                items={vnd.rubricIds.length ? rubricNames(vnd.rubricIds).split(", ") : []}
                            />
                            <ChipsField
                                label="Группы доступа"
                                items={vnd.userGroupIds.length ? userGroupNames(vnd.userGroupIds).split(", ") : []}
                            />
                            <ReadOnlyField label="Уровень секретности" value={secrecyLevelName(vnd.secrecyLevelId)}/>
                        </div>
                    </div>
                </div>
                </>
            )}

            {tab === "editions" && (
                <div className="text-[13px] text-[#8b97ab] py-8 text-center">Раздел в разработке</div>
            )}
            {tab === "actual" && (
                <div className="text-[13px] text-[#8b97ab] py-8 text-center">Раздел в разработке</div>
            )}
            {tab === "links" && (
                <div className="text-[13px] text-[#8b97ab] py-8 text-center">Раздел в разработке</div>
            )}
        </div>
    );
}

// ============================================================
// Мелкие переиспользуемые кусочки — визуально повторяют inputClass/SelectListField из CreateVndPage
// ============================================================

function ReadOnlyField({label, value}: { label: string; value: string }) {
    return (
        <div>
            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">{label}</label>
            <div className={fieldBoxClass}>{value}</div>
        </div>
    );
}

function ChipsField({label, items}: { label: string; items: string[] }) {
    return (
        <div>
            <label className="block text-[12px] font-semibold text-[#3a4560] mb-1.5">{label}</label>
            <div className={`${fieldBoxClass} min-h-10 h-auto flex-wrap gap-1.5 py-2`}>
                {items.length > 0 ? (
                    items.map((item) => (
                        <span key={item} className="px-2.5 py-1 rounded-full bg-[#f2f5f9] text-[#55617a] text-[11.5px] font-medium">
                            {item}
                        </span>
                    ))
                ) : (
                    <span className="text-[#a3adbd]">—</span>
                )}
            </div>
        </div>
    );
}