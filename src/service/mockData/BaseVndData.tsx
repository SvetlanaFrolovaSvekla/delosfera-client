import type {
    ApprovalBody,
    Keyword,
    OrganizationUnit,
    Rubric,
    SecurityLevel,
    UserGroup,
} from "@/service/mockData/DictionaryData.tsx";

// статусы ВНД действующие, на актуализации, на согласовании, на консолидации, архивирован
export type VndStatusKey = "active" | "onact" | "review" | "consol" | "arch" | "draft";;
// статусы просмотра: все, действующие, архивированные, черновики
export type VndScope = "all" | "active" | "arch" | "draft";
// статусы последней актуализации: без изменений, с изменениями
export type LastActualizationStatus = "no_changes" | "with_changes";

export interface VndRedaction {
    id: string;      // Совместно с code редакции, будет автоинкремент
    vndId: string;    // К какому ВНД относится
    date: string;      // Дата создания редакции
    docRu: string;
    docKg: string;
    docEn: string;
    attachmentIds: string[]; // Вложения (ссылки на файлы/Attachment.id)
}

export interface Vnd {
    id: string;
    code: string;          // Код документа
    name: string;           // Наименование документа
    typeId: string;          // Вид документа — ссылка на DictionaryTypeVnd.id
    status: VndStatusKey;    // Статус документа (в архиве, на консолидации и т.д.)

    developerId: OrganizationUnit["id"];              // Разработчик (СП)
    curatorDeveloperId?: string;                        // Куратор разработчика (User.id), если есть
    organId: ApprovalBody["id"];                        // Орган утверждения
    responsibleExecutorIds: OrganizationUnit["id"][];   // Ответственные исполнители (может быть несколько СП)

    outgoingLinks: string[]; // Исходящие ссылки — документы/файлы, на которые ссылается сам этот ВНД
    incomingLinks: string[]; // Обратные ссылки — другие документы, которые ссылаются на этот ВНД

    // --- Даты
    adoptionDate: string; // Дата принятия документа
    adoptionCode: string; // Номер принятия документа

    effectiveDate: string; // Дата вступления документа в силу

    requisitesChangedDate: string; // Дата внесения изменений в реквизиты ВНД
    revisionChangedDate: string;    // Дата внесения изменений в содержимое ВНД (редактирование, добавление редакции)

    cancelDate: string;    // Дата отмены действия документа
    cancelCode: string;    // Номер отмены действия документа
    cancelReason: string;  // Причина отмены

    archivedDate: string;   // Дата архивации документа

    dueActualizationDate: string;               // Дата, до которой надо актуализировать документ
    lastActualizationDate: string;               // Дата последней актуализации
    lastActualizationStatus: LastActualizationStatus; // Статус последней актуализации (без изменений, с изменениями)

    // --- Если ВНД в архиве
    daysInArchive?: number; // Количество дней в архиве (только для архивных документов)

    // --- Классификаторы
    keywordIds: Keyword["id"][];       // Ключевые слова (может быть несколько)
    rubricId: Rubric["id"];             // Рубрикатор
    secrecyLevelId: SecurityLevel["id"]; // Уровень секретности

    // --- Доступ
    userGroupIds: UserGroup["id"][]; // Группы, которые могут просматривать ВНД (может быть несколько)

    // --- Содержимое ВНД
    revisionIds: VndRedaction["id"][]; // Редакции документа
}

//////////////////////////////////////////////////////////////

// --- ВНД (документы) - мокданные
export const VND_LIST: Vnd[] = [
    {
        id: "ВНД-062",
        code: "10062",
        name: "Порядок работы с обеспечением (залогами)",
        typeId: "13", // Порядок
        status: "consol",

        developerId: "26",              // Управление рисками
        curatorDeveloperId: "osmonov",
        organId: "3",                   // Правление
        responsibleExecutorIds: ["26"],

        outgoingLinks: [],
        incomingLinks: [],

        adoptionDate: "09.02.2023",
        adoptionCode: "пр. №4(2)",

        effectiveDate: "16.02.2023",

        requisitesChangedDate: "12.01.2026",
        revisionChangedDate: "20.07.2026",

        cancelDate: "",
        cancelCode: "",
        cancelReason: "",

        archivedDate: "",

        dueActualizationDate: "09.08.2026",
        lastActualizationDate: "09.08.2025",
        lastActualizationStatus: "with_changes",

        keywordIds: ["4", "8"],   // Ответственность, Матрица
        rubricId: "5",             // Управление рисками
        secrecyLevelId: "3",       // Секретно

        userGroupIds: ["g3"],      // Риск-менеджмент

        revisionIds: ["ВНД-062-r3"],
    },
    {
        id: "ВНД-084",
        code: "10084",
        name: "Политика управления кредитными рисками Политика управления кредитными рисками Политика управления кредитными рисками Политика управления кредитными рисками Политика управления кредитными рисками Политика управления кредитными рисками Политика управления кредитными рисками Политика управления кредитными рисками",
        typeId: "11", // Политика
        status: "active",

        developerId: "26",              // Управление рисками
        curatorDeveloperId: "osmonov",
        organId: "4",                   // Совет директоров
        responsibleExecutorIds: ["26", "8"],

        outgoingLinks: [],
        incomingLinks: [],

        adoptionDate: "14.03.2021",
        adoptionCode: "пр. №9(1)",

        effectiveDate: "01.04.2021",

        requisitesChangedDate: "05.05.2025",
        revisionChangedDate: "18.06.2026",

        cancelDate: "",
        cancelCode: "",
        cancelReason: "",

        archivedDate: "",

        dueActualizationDate: "22.07.2026",
        lastActualizationDate: "22.07.2025",
        lastActualizationStatus: "no_changes",

        keywordIds: ["7"],   // Безопасность
        rubricId: "5",        // Управление рисками
        secrecyLevelId: "2",  // Конфиденциально

        userGroupIds: ["g3"],

        revisionIds: ["ВНД-084-r5"],
    },
    {
        id: "ВНД-011",
        code: "10011",
        name: "Регламент кассовых операций",
        typeId: "17", // Регламент
        status: "onact",

        developerId: "38",              // УБУиО
        curatorDeveloperId: "ibraeva",
        organId: "3",                   // Правление
        responsibleExecutorIds: ["38"],

        outgoingLinks: [],
        incomingLinks: [],

        adoptionDate: "20.01.2020",
        adoptionCode: "пр. №2(5)",

        effectiveDate: "01.02.2020",

        requisitesChangedDate: "10.10.2024",
        revisionChangedDate: "01.07.2026",

        cancelDate: "",
        cancelCode: "",
        cancelReason: "",

        archivedDate: "",

        dueActualizationDate: "25.07.2026",
        lastActualizationDate: "25.07.2025",
        lastActualizationStatus: "with_changes",

        keywordIds: ["6"],    // Расход
        rubricId: "11",        // Бухгалтерский учет и отчетность
        secrecyLevelId: "1",   // Открытый доступ

        userGroupIds: [],

        revisionIds: ["ВНД-011-r2"],
    },
    {
        id: "ВНД-201",
        code: "10201",
        name: "Кодекс корпоративной этики",
        typeId: "5", // Кодекс
        status: "active",

        developerId: "32",              // Управление человеческими ресурсами
        curatorDeveloperId: "jumaeva",
        organId: "2",                   // Общее собрание акционеров
        responsibleExecutorIds: ["32"],

        outgoingLinks: [],
        incomingLinks: [],

        adoptionDate: "05.05.2019",
        adoptionCode: "пр. ОСА-1",

        effectiveDate: "01.06.2019",

        requisitesChangedDate: "01.03.2024",
        revisionChangedDate: "14.09.2025",

        cancelDate: "",
        cancelCode: "",
        cancelReason: "",

        archivedDate: "",

        dueActualizationDate: "28.09.2026",
        lastActualizationDate: "28.09.2025",
        lastActualizationStatus: "no_changes",

        keywordIds: ["4"],    // Ответственность
        rubricId: "7",         // Управление персоналом
        secrecyLevelId: "1",   // Открытый доступ

        userGroupIds: [],

        revisionIds: ["ВНД-201-r2"],
    },
    {
        id: "ВНД-037",
        code: "10037",
        name: "Регламент управления ликвидностью (ред. 2019)",
        typeId: "17", // Регламент
        status: "arch",

        developerId: "4",               // Управление казначейских операций
        curatorDeveloperId: "usenov",
        organId: "3",                   // Правление
        responsibleExecutorIds: ["4"],

        outgoingLinks: [],
        incomingLinks: [],

        adoptionDate: "10.01.2019",
        adoptionCode: "пр. №1(4)",

        effectiveDate: "01.02.2019",

        requisitesChangedDate: "01.02.2019",
        revisionChangedDate: "01.02.2019",

        cancelDate: "14.03.2024",
        cancelCode: "пр. №8(3)",
        cancelReason: "Заменён новой редакцией ВНД-037 v4.1",

        archivedDate: "20.03.2024",

        dueActualizationDate: "",
        lastActualizationDate: "",
        lastActualizationStatus: "no_changes",

        daysInArchive: 493,

        keywordIds: [],
        rubricId: "9",          // Депозиты и расчетно-кассовое обслуживание
        secrecyLevelId: "2",    // Конфиденциально

        userGroupIds: [],

        revisionIds: ["ВНД-037-r1"],
    },
];

//////////////////////////////////////////////////////////////

// --- Редакции ВНД - мокданные
export const VND_REDACTIONS: VndRedaction[] = [
    {
        id: "ВНД-062-r3",
        vndId: "ВНД-062",
        date: "09.08.2025",
        docRu: "Текст редакции на русском языке...",
        docKg: "Редакциянын кыргыз тилиндеги тексти...",
        docEn: "Revision text in English...",
        attachmentIds: [],
    },
    {
        id: "ВНД-084-r5",
        vndId: "ВНД-084",
        date: "22.07.2025",
        docRu: "Текст редакции на русском языке...",
        docKg: "Редакциянын кыргыз тилиндеги тексти...",
        docEn: "Revision text in English...",
        attachmentIds: [],
    },
    {
        id: "ВНД-011-r2",
        vndId: "ВНД-011",
        date: "25.07.2025",
        docRu: "Текст редакции на русском языке...",
        docKg: "Редакциянын кыргыз тилиндеги тексти...",
        docEn: "Revision text in English...",
        attachmentIds: [],
    },
    {
        id: "ВНД-201-r2",
        vndId: "ВНД-201",
        date: "28.09.2025",
        docRu: "Текст редакции на русском языке...",
        docKg: "Редакциянын кыргыз тилиндеги тексти...",
        docEn: "Revision text in English...",
        attachmentIds: [],
    },
    {
        id: "ВНД-037-r1",
        vndId: "ВНД-037",
        date: "01.02.2019",
        docRu: "Текст редакции на русском языке...",
        docKg: "Редакциянын кыргыз тилиндеги тексти...",
        docEn: "Revision text in English...",
        attachmentIds: [],
    },
];