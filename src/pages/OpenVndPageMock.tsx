import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {
    ArrowLeft, Layers, Copy, FileText, Download, MoreHorizontal,
    AlertTriangle, Search, Link2, Shield, ChevronRight, Key, User, Repeat,
} from "lucide-react";
import {STATUS_META} from "@/constants/vndStatus.ts";

// ============================================================
// МОК-ДАННЫЕ (карточка ВНД-062 «Порядок работы с обеспечением
// (залогами)» — статус «Консолидация», взято из прототипа Creatio)
// ============================================================

const vndCard = {
    id: "ВНД-062",
    code: "10062",
    bp: "1.2.2.1",
    title: "Порядок работы с обеспечением (залогами)",
    name: "Порядок работы с обеспечением (залогами), утв. Правлением, протокол №23(8) от 14.02.2024",
    statusKey: "consol" as const,
    section: "Внутренние нормативные документы",
    kind: "порядок",
    organ: "Правление",
    developer: "Управление рисков",
    editor: "А. Осмонов",
    executors: "Начальник Управления рисков",
    secrecy: "Для служебного пользования",
    period: "2 года",
    carrier: "Электронный документ",
    keep: "Постоянно",
    keywords: ["обеспечение", "залог", "кредитный риск", "ответственность", "безопасность"],
    rubricators: ["Кредитная деятельность / Обеспечение", "Риск-менеджмент / Кредитный риск"],
    groups: ["Управление рисков", "Юридический департамент", "Кредитный комитет"],
    dates: {
        accepted: "14.02.2024", acceptedNo: "протокол №23(8)",
        effective: "01.03.2024", actualized: "12.02.2025",
        lastEd: "05.07.2026", cardChanged: "03.07.2026",
        restricted: "—", cancelled: "—",
    },
    links: [
        {code: "ТИД-2026-014", text: "Таблица изменений (текущая)", statusKey: "review" as const},
        {code: "ВНД-011", text: "Регламент кассовых операций — ссылается", statusKey: "active" as const},
        {code: "ДОГ-шаблон", text: "Договор залога (шаблон)", statusKey: "active" as const},
    ],
    versions: [
        {v: "v4.0", tag: "Формируется", tone: "consol" as const, date: "после утв. ТИД-2026-014", hash: "—", by: "консолидация правок"},
        {v: "v3.0", tag: "Действующая", tone: "active" as const, date: "14.02.2024", hash: "a7f3…9e21", by: "протокол №23(8) · КЭП Б. Токтосунова"},
        {v: "v2.0", tag: "Архив", tone: "arch" as const, date: "11.03.2022", hash: "c1b8…44de", by: "протокол №11(4)"},
        {v: "v1.0", tag: "Архив", tone: "arch" as const, date: "20.05.2020", hash: "5d90…7a02", by: "первичная редакция"},
    ],
    audit: [
        {text: "Переведён в «Консолидация»", by: "сегодня, 11:20 · система (после утв. ТИД)"},
        {text: "Загружен протокол утверждения ТИД", by: "сегодня, 11:18 · Б. Токтосунова"},
        {text: "Изменены метаданные (владелец)", by: "03.07.2026 · IT-администратор"},
        {text: "Создан ID-Draft → ВНД-062", by: "20.05.2020 · инициатор"},
    ],
};

const editions = [
    {
        ver: "ред. 3", v: "v3.0", date: "14.02.2024", current: true, atts: 2,
        langs: {ru: true, ky: true, en: false},
        toc: ["1. Общие положения", "2. Виды принимаемого обеспечения", "3. Оценка предмета залога", "4. Учёт и переоценка обеспечения", "5. Реализация предмета залога"],
        body: {
            ru: "Настоящий Порядок определяет правила работы Банка с обеспечением по кредитным операциям, включая приём, оценку, учёт, переоценку и реализацию предмета залога. Оценка предмета залога проводится по справедливой стоимости с применением дисконтов, установленных Кредитным комитетом. Реализация предмета залога осуществляется в порядке ст. 318 ГК КР — во внесудебном либо судебном порядке по соглашению сторон.",
            ky: "Ушул Тартип Банктын кредиттик операциялар боюнча камсыздоо менен иштөө эрежелерин аныктайт: кабыл алуу, баалоо, эсепке алуу, кайра баалоо жана күрөө предметин сатуу. Күрөө предметин баалоо Кредиттик комитет тарабынан белгиленген дисконттор менен адилет наркы боюнча жүргүзүлөт.",
        },
    },
    {
        ver: "ред. 2", v: "v2.0", date: "11.03.2022", current: false, atts: 1,
        langs: {ru: true, ky: false, en: false},
        toc: ["1. Общие положения", "2. Виды обеспечения", "3. Оценка залога", "4. Реализация обеспечения"],
        body: {ru: "Редакция 2020 года. Реализация предмета залога осуществляется во внесудебном порядке по решению Банка. Переоценка обеспечения отражается на счетах бухгалтерского учёта.", ky: ""},
    },
    {
        ver: "ред. 1", v: "v1.0", date: "20.05.2020", current: false, atts: 1,
        langs: {ru: true, ky: false, en: false},
        toc: ["1. Общие положения", "2. Обеспечение", "3. Реализация"],
        body: {ru: "Первичная редакция Порядка. Определяет базовые правила приёма и учёта обеспечения по кредитным операциям Банка.", ky: ""},
    },
];

const actualizationJournal = [
    {date: "12.02.2025", type: "Итерирован" as const, changed: true, plan: true, by: "А. Осмонов", note: "Плановая актуализация: уточнены пп. 3.2, 4.4 по замечаниям ЮД и УБУиО. Сформирована новая редакция."},
    {date: "20.08.2023", type: "Валидирован" as const, changed: false, plan: true, by: "А. Осмонов", note: "Плановая актуализация без изменений — направлена СЗ куратору о том, что актуализация не требуется. Новая редакция не создавалась."},
    {date: "11.03.2022", type: "Итерирован" as const, changed: true, plan: true, by: "Б. Кадыров", note: "Внесены изменения по ТИД-2022-004 (протокол №11(4)). Сформирована редакция 2."},
];

const VND_TABS = [
    {id: "passport", label: "Паспорт"},
    {id: "editions", label: "Редакции и текст"},
    {id: "actual", label: "Актуализация"},
    {id: "links", label: "Связи и история"},
] as const;

type VndTabId = (typeof VND_TABS)[number]["id"];

const VERSION_TONE_META: Record<string, { color: string; bg: string }> = {
    consol: {color: "#7a5ce0", bg: "#efeafe"},
    active: {color: "#1c7a4d", bg: "#e2f4ea"},
    arch: {color: "#6b7686", bg: "#eceff3"},
};

// ============================================================
// СТРАНИЦА
// ============================================================

export function OpenVndPageMock() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<VndTabId>("passport");
    const [edIdx, setEdIdx] = useState(0);
    const [edLang, setEdLang] = useState<"ru" | "ky" | "en">("ru");

    const meta = STATUS_META[vndCard.statusKey];
    const curEd = editions[edIdx];
    const isOldEdition = !curEd.current;
    const availableLangs = (["ru", "ky", "en"] as const).filter((l) => curEd.langs[l]);

    const classification = [
        ["Раздел документа", vndCard.section],
        ["Вид документа", vndCard.kind],
        ["Орган утверждения", vndCard.organ],
        ["Код бизнес-процесса", vndCard.bp],
        ["Уровень секретности", vndCard.secrecy],
    ];
    const responsibility = [
        ["Разработчик (СП)", vndCard.developer],
        ["Ответственные исполнители", vndCard.executors],
        ["Ответственный редактор", vndCard.editor],
    ];
    const dates = [
        ["Дата принятия", `${vndCard.dates.accepted} · ${vndCard.dates.acceptedNo}`],
        ["Дата вступления в силу", vndCard.dates.effective],
        ["Дата актуализации", vndCard.dates.actualized],
        ["Дата добавления последней редакции", vndCard.dates.lastEd],
        ["Дата изменения карточки", vndCard.dates.cardChanged],
        ["Дата ограничения действия", vndCard.dates.restricted],
        ["Дата отмены действия", vndCard.dates.cancelled],
    ];
    const storage = [
        ["Носитель хранения", vndCard.carrier],
        ["Срок хранения (Перечень НБКР)", vndCard.keep],
        ["Периодичность актуализации", vndCard.period],
    ];

    return (
        <div className="max-w-[1320px] mx-auto px-[30px] pt-[22px] pb-[60px]">
            <button
                onClick={() => navigate("/basevnd")}
                className="inline-flex items-center gap-[7px] border-none bg-transparent text-[#8b97ab] text-[13px] font-medium cursor-pointer py-1 mb-3.5 hover:text-[#4e57d6]"
            >
                <ArrowLeft className="w-4 h-4" strokeWidth={2}/>
                База ВНД
            </button>

            {/* Баннер консолидации */}
            <div className="flex items-center gap-[15px] px-[18px] py-[15px] border border-[#ddd0fa] bg-gradient-to-r from-[#f4f0ff] to-[#faf8ff] rounded-[13px] mb-[18px]">
                <span className="w-10 h-10 flex-none rounded-[11px] bg-[#efeafe] text-[#7a5ce0] grid place-items-center">
                    <Layers className="w-[21px] h-[21px]" strokeWidth={1.8}/>
                </span>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14px] text-[#2a2352]">Документ в статусе «Консолидация»</div>
                    <div className="text-[12.5px] text-[#6b6494] mt-0.5">
                        После утверждения <b>ТИД-2026-014</b> внесите правки Ответственным редактором и сформируйте версию v4.0.
                    </div>
                </div>
                <button className="inline-flex items-center gap-2 h-[38px] px-[15px] border border-[#ddd0fa] rounded-[9px] bg-white text-[#7a5ce0] font-semibold text-[12.5px] cursor-pointer flex-none hover:bg-[#f7f4ff]">
                    <Copy className="w-4 h-4" strokeWidth={1.8}/>
                    Открыть «Два окна»
                </button>
                <button className="h-[38px] px-[15px] border-none rounded-[9px] bg-[#7a5ce0] text-white font-semibold text-[12.5px] cursor-pointer flex-none hover:brightness-[1.06]">
                    Сформировать v4.0
                </button>
            </div>

            {/* Заголовок карточки */}
            <div className="flex items-start justify-between gap-5 flex-wrap mb-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-[9px] mb-2 flex-wrap">
                        <span className="font-mono text-[13px] font-semibold text-[#4e57d6] bg-[#ececfc] px-[10px] py-[3px] rounded-[7px]">
                            {vndCard.code}
                        </span>
                        <span className="font-mono text-[12px] text-[#8b97ab]">{vndCard.id}</span>
                        <span
                            className="inline-flex items-center text-[11px] font-semibold py-0.5 px-[9px] rounded-full"
                            style={{color: meta.color, background: meta.bg}}
                        >
                            {meta.label}
                        </span>
                        <span className="font-mono text-[12px] text-[#8b97ab]">действующая {editions.find((e) => e.current)?.v}</span>
                        <span className="font-mono text-[12px] text-[#a3adbd]">БП {vndCard.bp}</span>
                    </div>
                    <h1 className="m-0 text-[22px] font-bold tracking-[-.02em] max-w-[680px] leading-[1.25]">
                        {vndCard.title}
                    </h1>
                    <p className="mt-2 mb-0 text-[12.5px] text-[#8b97ab] max-w-[680px] leading-[1.5]">
                        {vndCard.name}
                    </p>
                </div>
                <div className="flex gap-[9px] flex-wrap">
                    <button className="inline-flex items-center gap-[7px] h-[38px] px-3.5 border border-[#e5e9f0] rounded-[10px] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]">
                        <FileText className="w-4 h-4" strokeWidth={1.8}/>
                        Открыть ТИД
                    </button>
                    <button className="w-[38px] h-[38px] grid place-items-center border border-[#e5e9f0] rounded-[10px] bg-white text-[#55617a] cursor-pointer hover:bg-[#f6f8fb]">
                        <Download className="w-[17px] h-[17px]" strokeWidth={1.8}/>
                    </button>
                    <button className="w-[38px] h-[38px] grid place-items-center border border-[#e5e9f0] rounded-[10px] bg-white text-[#55617a] cursor-pointer hover:bg-[#f6f8fb]">
                        <MoreHorizontal className="w-[17px] h-[17px]" strokeWidth={1.8}/>
                    </button>
                </div>
            </div>

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

            {/* TAB: Паспорт */}
            {tab === "passport" && (
                <div className="grid grid-cols-[1.45fr_1fr] gap-[18px] items-start">
                    <div className="flex flex-col gap-[18px]">
                        <Card title="Классификация">
                            <div className="grid grid-cols-2 gap-x-[26px] gap-y-3.5">
                                {classification.map(([label, value]) => (
                                    <Field key={label} label={label} value={value} capitalize/>
                                ))}
                            </div>
                        </Card>

                        <Card title="Ответственность">
                            <div className="grid grid-cols-2 gap-x-[26px] gap-y-3.5">
                                {responsibility.map(([label, value]) => (
                                    <Field key={label} label={label} value={value}/>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-[#f3f6f9] text-[11.5px] text-[#8b97ab] leading-[1.5]">
                                Разработчик и Ответственные исполнители подставляются автоматически по СП инициатора; редактор и разработчик — разные роли.
                            </div>
                        </Card>

                        <Card title="Даты и жизненный цикл">
                            <div className="grid grid-cols-2 gap-x-[26px] gap-y-3.5">
                                {dates.map(([label, value]) => (
                                    <Field key={label} label={label} value={value}/>
                                ))}
                            </div>
                            <div className="mt-3.5 p-[11px_13px] bg-[#f6f8fb] border border-[#eef2f7] rounded-[10px] flex gap-[9px] items-start">
                                <AlertTriangle className="w-4 h-4 flex-none text-[#4e57d6] mt-px" strokeWidth={1.8}/>
                                <span className="text-[11.5px] text-[#55617a] leading-[1.5]">
                                    <b className="text-[#3a4560]">Статус проставляется автоматически по датам:</b>{" "}
                                    получена согласованная ТИД — карточка переведена в консолидацию. Доступно ручное изменение.
                                </span>
                            </div>
                        </Card>
                    </div>

                    <div className="flex flex-col gap-[18px]">
                        <Card title="Хранение">
                            <div className="flex flex-col gap-3.5">
                                {storage.map(([label, value]) => (
                                    <Field key={label} label={label} value={value}/>
                                ))}
                            </div>
                        </Card>

                        <Card title="Рубрикатор">
                            <div className="flex flex-col gap-2">
                                {vndCard.rubricators.map((r) => (
                                    <div key={r} className="flex items-center gap-[9px] text-[12.5px] text-[#26324a]">
                                        <Layers className="w-[15px] h-[15px] flex-none text-[#8b97ab]" strokeWidth={1.8}/>
                                        {r}
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card title="Ключевые слова">
                            <div className="flex flex-wrap gap-[7px]">
                                {vndCard.keywords.map((k) => (
                                    <span key={k} className="px-[10px] py-1 rounded-full bg-[#f2f5f9] text-[#55617a] text-[11.5px] font-medium">
                                        {k}
                                    </span>
                                ))}
                            </div>
                        </Card>

                        <Card title="Группы просмотра">
                            <div className="flex flex-wrap gap-[7px]">
                                {vndCard.groups.map((g) => (
                                    <span key={g} className="inline-flex items-center gap-[6px] px-[10px] py-1 rounded-[8px] border border-[#e5e9f0] text-[#55617a] text-[11.5px] font-medium">
                                        <User className="w-[13px] h-[13px] text-[#8b97ab]" strokeWidth={1.9}/>
                                        {g}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-[11px] text-[11px] text-[#a3adbd] leading-[1.5]">
                                Уровень секретности «{vndCard.secrecy}» — доступ ограничен перечисленными группами.
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB: Редакции и текст */}
            {tab === "editions" && (
                <div className="grid grid-cols-[300px_1fr] gap-[18px] items-start">
                    <div className="bg-white border border-[#e9edf3] rounded-2xl p-3.5">
                        <div className="text-[11px] font-bold uppercase tracking-[.04em] text-[#a3adbd] px-1 pb-2.5">
                            Редакции документа
                        </div>
                        <div className="flex flex-col gap-2">
                            {editions.map((e, i) => (
                                <button
                                    key={e.v}
                                    onClick={() => {
                                        setEdIdx(i);
                                        setEdLang(e.langs.ru ? "ru" : e.langs.ky ? "ky" : "en");
                                    }}
                                    className="w-full flex items-center gap-[11px] px-[13px] py-[11px] rounded-[11px] cursor-pointer text-left"
                                    style={{
                                        border: `1px solid ${i === edIdx ? "#4e57d6" : "#e9edf3"}`,
                                        background: i === edIdx ? "#ececfc" : "#fff",
                                    }}
                                >
                                    <span className="flex-none font-mono font-bold text-[13px] text-[#1c2740] w-[38px]">{e.v}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className="flex items-center gap-[7px]">
                                            <span className="font-semibold text-[12.5px] text-[#26324a]">{e.ver}</span>
                                            {e.current && (
                                                <span className="text-[9.5px] font-bold px-[6px] py-px rounded-[5px] text-[#1c7a4d] bg-[#e2f4ea]">
                                                    актуальная
                                                </span>
                                            )}
                                        </span>
                                        <span className="block text-[11px] text-[#8b97ab] mt-0.5">{e.date} · вложений: {e.atts}</span>
                                        <span className="flex gap-1 mt-[5px]">
                                            {(["ru", "ky", "en"] as const)
                                                .filter((l) => e.langs[l])
                                                .map((l) => (
                                                    <span key={l} className="font-mono text-[9.5px] font-bold px-[5px] py-px rounded-[4px] bg-[#f2f5f9] text-[#8b97ab]">
                                                        {l.toUpperCase()}
                                                    </span>
                                                ))}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        <button className="w-full mt-[11px] inline-flex items-center justify-center gap-2 h-[38px] border border-[#e5e9f0] rounded-[10px] bg-white text-[#3a4560] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb]">
                            <Copy className="w-4 h-4" strokeWidth={1.8}/>
                            Сравнение редакций
                        </button>
                    </div>

                    <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                        <div className="px-5 py-[13px] border-b border-[#eef2f7] flex items-center gap-3 flex-wrap">
                            <div className="font-semibold text-[13.5px] text-[#1c2740]">{curEd.ver} · {curEd.v}</div>
                            <span className="text-[12px] text-[#8b97ab]">{curEd.date}</span>
                            <div className="flex-1"/>
                            <div className="flex gap-[7px]">
                                {availableLangs.map((l) => (
                                    <button
                                        key={l}
                                        onClick={() => setEdLang(l)}
                                        className="h-7 px-2.5 rounded-[7px] text-[11px] font-semibold cursor-pointer"
                                        style={{
                                            border: `1px solid ${edLang === l ? "#4e57d6" : "#e5e9f0"}`,
                                            color: edLang === l ? "#4e57d6" : "#55617a",
                                            background: edLang === l ? "#ececfc" : "#fff",
                                        }}
                                    >
                                        {l.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isOldEdition && (
                            <div className="flex items-center gap-[10px] px-5 py-[11px] bg-[#fdf6e8] border-b border-[#f0dcae]">
                                <AlertTriangle className="w-[17px] h-[17px] flex-none text-[#b3730a]" strokeWidth={1.9}/>
                                <span className="text-[12px] text-[#9a6408]">
                                    Вы просматриваете <b>устаревшую редакцию</b>. Действующая редакция — актуальная версия документа.
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-[210px_1fr] min-h-[340px]">
                            <div className="border-r border-[#eef2f7] p-[14px_16px] bg-[#fbfcfe]">
                                <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-[#a3adbd] mb-[9px]">
                                    Содержание
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    {curEd.toc.map((t) => (
                                        <div key={t} className="text-[12px] text-[#55617a] px-2 py-1.5 rounded-[7px] cursor-pointer hover:bg-[#eef2f7] hover:text-[#4e57d6]">
                                            {t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-[16px_22px]">
                                <div className="relative mb-3.5">
                                    <Search className="absolute left-[11px] top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-[#8b97ab] pointer-events-none" strokeWidth={1.8}/>
                                    <input
                                        placeholder="Поиск по тексту редакции…"
                                        className="w-full h-9 pl-[34px] pr-3 border border-[#e5e9f0] rounded-[9px] bg-[#f9fafc] text-[12.5px] text-[#26324a] outline-none focus:bg-white focus:border-[#4e57d6]"
                                    />
                                </div>
                                <p className="m-0 text-[13.5px] text-[#26324a] leading-[1.7]">
                                    {curEd.body[edLang] || curEd.body.ru}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Актуализация */}
            {tab === "actual" && (
                <div className="max-w-[860px]">
                    <div className="flex items-center gap-3.5 px-[18px] py-3.5 bg-[#ececfc] border border-[#d9daf7] rounded-[13px] mb-4">
                        <Repeat className="w-5 h-5 flex-none text-[#4e57d6]" strokeWidth={1.8}/>
                        <div className="flex-1">
                            <div className="font-semibold text-[13.5px] text-[#1c2740]">
                                Периодичность актуализации: {vndCard.period} (вид «{vndCard.kind}»)
                            </div>
                            <div className="text-[12px] text-[#55617a] mt-0.5">
                                Плановая актуализация — до 09.08.2026 · периодичность задаётся по виду ВНД (кодекс — 1 год, прочие — 2 года).
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                        <div className="px-5 pt-[15px] pb-3 border-b border-[#eef2f7] flex items-center gap-[9px]">
                            <h2 className="m-0 text-[14px] font-semibold">Журнал актуализаций</h2>
                            <span className="ml-auto text-[11px] text-[#a3adbd]">даты и наличие изменений</span>
                        </div>
                        <div className="px-5 pt-1.5 pb-3.5">
                            {actualizationJournal.map((j, i) => (
                                <div key={i} className="flex gap-3.5 py-3.5 border-b border-[#f3f6f9] last:border-b-0">
                                    <div className="flex-none w-[86px]">
                                        <div className="font-mono text-[13px] font-semibold text-[#1c2740]">{j.date}</div>
                                        <div className="text-[11px] text-[#8b97ab] mt-0.5">{j.plan ? "Плановая" : "Внеплановая"}</div>
                                    </div>
                                    <div className="flex-1 min-w-0 border-l-2 border-[#eef2f7] pl-3.5">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span
                                                className="text-[11px] font-semibold px-[9px] py-0.5 rounded-full"
                                                style={{
                                                    color: j.type === "Итерирован" ? "#1c7a4d" : "#0e8091",
                                                    background: j.type === "Итерирован" ? "#e2f4ea" : "#dbf2f5",
                                                }}
                                            >
                                                {j.type}
                                            </span>
                                            <span
                                                className="text-[11px] font-semibold px-[9px] py-0.5 rounded-full"
                                                style={{
                                                    color: j.changed ? "#1c7a4d" : "#0e8091",
                                                    background: j.changed ? "#e2f4ea" : "#dbf2f5",
                                                }}
                                            >
                                                {j.changed ? "С изменениями" : "Без изменений"}
                                            </span>
                                        </div>
                                        <div className="text-[12.5px] text-[#3a4560] leading-[1.5]">{j.note}</div>
                                        <div className="text-[11px] text-[#8b97ab] mt-[3px]">{j.by}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2.5 mt-3.5 flex-wrap">
                        <div className="flex-1 min-w-[220px] flex gap-[9px] items-start p-3 bg-[#f6f8fb] border border-[#eef2f7] rounded-[11px]">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[6px] text-[#0e8091] bg-[#dbf2f5] flex-none">Валидирован</span>
                            <span className="text-[12px] text-[#55617a] leading-[1.5]">
                                пересмотрен без изменений — новая редакция не создаётся, дата изменения ВНД не меняется.
                            </span>
                        </div>
                        <div className="flex-1 min-w-[220px] flex gap-[9px] items-start p-3 bg-[#f6f8fb] border border-[#eef2f7] rounded-[11px]">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-[6px] text-[#1c7a4d] bg-[#e2f4ea] flex-none">Итерирован</span>
                            <span className="text-[12px] text-[#55617a] leading-[1.5]">
                                пересмотрен с изменениями — формируется новая редакция, обновляется дата изменения.
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: Связи и история */}
            {tab === "links" && (
                <div className="grid grid-cols-2 gap-[18px] items-start">
                    <div className="flex flex-col gap-[18px]">
                        <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex items-center gap-[9px]">
                                <Link2 className="w-[18px] h-[18px] text-[#4e57d6]" strokeWidth={1.8}/>
                                <h2 className="m-0 text-[14px] font-semibold">Связанные документы и ссылки</h2>
                            </div>
                            {vndCard.links.map((l) => {
                                const lm = STATUS_META[l.statusKey];
                                return (
                                    <button
                                        key={l.code}
                                        className="w-full flex items-center gap-3 px-5 py-3 border-b border-[#f3f6f9] last:border-b-0 bg-transparent text-left cursor-pointer hover:bg-[#f8fafc]"
                                    >
                                        <span className="w-[34px] h-[34px] flex-none rounded-[9px] bg-[#f2f5f9] text-[#55617a] grid place-items-center">
                                            <FileText className="w-[17px] h-[17px]" strokeWidth={1.7}/>
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="flex items-center gap-2">
                                                <span className="font-mono text-[11.5px] font-semibold text-[#4e57d6]">{l.code}</span>
                                                <span
                                                    className="text-[10.5px] font-semibold px-2 py-px rounded-full"
                                                    style={{color: lm.color, background: lm.bg}}
                                                >
                                                    {lm.label}
                                                </span>
                                            </span>
                                            <span className="block text-[12.5px] text-[#55617a] mt-0.5">{l.text}</span>
                                        </span>
                                        <ChevronRight className="w-4 h-4 flex-none text-[#c3ccd8]" strokeWidth={2}/>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                            <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7] flex items-center gap-[9px]">
                                <Shield className="w-[17px] h-[17px] text-[#8b97ab]" strokeWidth={1.8}/>
                                <h2 className="m-0 text-[14px] font-semibold">Журнал аудита</h2>
                                <span className="ml-auto text-[11px] text-[#a3adbd]">неизменяемый</span>
                            </div>
                            <div className="px-5 pt-1.5 pb-3.5">
                                {vndCard.audit.map((a, i) => (
                                    <div key={i} className="flex gap-[11px] py-2.5 border-t border-[#f3f6f9] first:border-t-0">
                                        <span className="w-[7px] h-[7px] flex-none rounded-full mt-1.5 bg-[#c3ccd8]"/>
                                        <div className="min-w-0">
                                            <div className="text-[12.5px] text-[#26324a] leading-[1.4]">{a.text}</div>
                                            <div className="text-[11px] text-[#8b97ab] mt-0.5">{a.by}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-[#e9edf3] rounded-2xl overflow-hidden">
                        <div className="px-5 pt-4 pb-3 border-b border-[#eef2f7]">
                            <h2 className="m-0 text-[14px] font-semibold">Версии и юридическая значимость</h2>
                        </div>
                        <div className="px-5 pt-1.5 pb-3.5">
                            {vndCard.versions.map((v) => {
                                const vm = VERSION_TONE_META[v.tone];
                                return (
                                    <div key={v.v} className="flex gap-[13px] py-3 border-b border-[#f3f6f9] last:border-b-0">
                                        <div className="flex-none text-center">
                                            <div className="font-mono text-[13px] font-bold text-[#1c2740]">{v.v}</div>
                                            <span
                                                className="inline-block mt-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-[5px] whitespace-nowrap"
                                                style={{color: vm.color, background: vm.bg}}
                                            >
                                                {v.tag}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 border-l-2 border-[#eef2f7] pl-3.5">
                                            <div className="text-[12.5px] text-[#26324a]">{v.date}</div>
                                            <div className="text-[11.5px] text-[#8b97ab] mt-0.5">{v.by}</div>
                                            <div className="flex items-center gap-1.5 mt-[5px]">
                                                <Key className="w-3 h-3 text-[#a3adbd]" strokeWidth={2}/>
                                                <span className="font-mono text-[10.5px] text-[#a3adbd]">hash {v.hash}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Мелкие переиспользуемые кусочки
// ============================================================

function Card({title, children}: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-[#e9edf3] rounded-2xl px-5 py-[18px]">
            <h2 className="m-0 mb-3.5 text-[12.5px] font-bold uppercase tracking-[.03em] text-[#3a4560]">
                {title}
            </h2>
            {children}
        </div>
    );
}

function Field({label, value, capitalize}: { label: string; value: string; capitalize?: boolean }) {
    return (
        <div className="min-w-0">
            <div className="text-[11.5px] text-[#8b97ab] font-medium mb-[3px]">{label}</div>
            <div className={`text-[13.5px] text-[#1c2740] font-medium ${capitalize ? "capitalize" : ""}`}>
                {value}
            </div>
        </div>
    );
}