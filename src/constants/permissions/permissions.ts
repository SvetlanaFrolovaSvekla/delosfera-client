// Зеркало backend enum PermissionCode (Modules/Users/Models/PermissionCode.cs)
export const PermissionCode = {
    /* Просмотр страницы актуализации ВНД */
    ViewVndActualizationPage: 1,

    /* Взять любую ВНД в актуализацию с последующим согласованием (без запроса права) */
    ActualizeAnyVndWithApproval: 2,

    /* Взять любую ВНД в актуализацию без согласования (без запроса права) */
    ActualizeAnyVndWithoutApproval: 3,

    /* Взять ВНД в актуализацию с последующим согласованием (по запросу права) */
    ActualizeVndWithApprovalByRequest: 4,

    /* Взять ВНД в актуализацию без согласования (по запросу права) */
    ActualizeVndWithoutApprovalByRequest: 5,

    /* Создать новую ВНД с последующим согласованием */
    CreateVndWithApproval: 6,

    /* Создать новую ВНД без последующего согласования */
    CreateVndWithoutApproval: 7,

    /* Удалить ВНД */
    DeleteVnd: 8,

    /* Редактировать последнюю редакцию без согласования, без создания новой редакции и изменения даты актуализации */
    EditLastRevisionDirectly: 9,

    /* Управление группами */
    ManageGroups: 10,

    /* Просмотр ВНД */
    ViewVnd: 11,

    /* Экспорт ВНД */
    ExportVnd: 12,

    /* Управление пользователями */
    ManageUsers: 13,

    /* Управление ролями */
    ManageRoles: 14,

    /* Просмотр ограниченной статистики */
    ViewLimitedStatistics: 15,

    /* Экспорт отчёта по полной статистике */
    ExportFullStatisticsReport: 16,

    /* Просмотр полной статистики */
    ViewFullStatistics: 17,

    /* Возможность выступать в роли согласующего */
    ActAsApprover: 18,

    /* Возможность изменять маршрут согласования (удалять лишних пользователей) */
    ModifyApprovalRoute: 19,

    /* Возможность просматривать черновики других пользователей */
    ViewOtherUsersDrafts: 20,

    /* Управление справочниками ВНД (Виды ВНД, Уровни секретности, Группы пользователей, Рубрикатор, Обязательные участники согласования) */
    ManageVndDictionaries: 21,

    /* Управление общими справочниками (Органы утверждения, Структурные подразделения, Должности) */
    ManageGeneralDictionaries: 22,

    /* Управление справочниками служебных записок (Категории СЗ) */
    ManageSzDictionaries: 23,

    /* Управление справочниками закупок (Чёрный список контрагентов, Пороги закупок) */
    ManageProcurementDictionaries: 24,

    /* Изменение реквизитов существующей ВНД и её связей с другими документами */
    EditVndRequisites: 25,
} as const;