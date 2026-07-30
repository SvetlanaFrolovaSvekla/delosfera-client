import type {
    ApprovalBody,
    Keyword,
    OrganizationUnit,
    Rubric,
    SecurityLevel,
    UserGroup,
} from "@/service/mockData/DictionaryData.tsx";

// статусы ВНД действующие, на актуализации, на согласовании, на консолидации, архивирован, черновик
export type VndStatusKey = "active" | "onact" | "review" | "consol" | "arch" | "draft";
// режимы просмотра: все, действующие, архивированные, черновики
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
