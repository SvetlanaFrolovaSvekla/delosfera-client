export interface Position {
    id: string;
    name: string;
}

export const POSITIONS: Position[] = [
    {id: "p1", name: "Гл. специалист"},
    {id: "p2", name: "Юрисконсульт"},
    {id: "p3", name: "Методолог"},
    {id: "p4", name: "Специалист по закупкам"},
    {id: "p5", name: "Зам. Председателя Правления"},
    {id: "p6", name: "Делопроизводитель"},
    {id: "p7", name: "Начальник управления"},
    {id: "p8", name: "Начальник департамента"},
    {id: "p9", name: "HR-директор"},
    {id: "p10", name: "Начальник отдела"},
    {id: "p11", name: "Главный бухгалтер"},
    {id: "p12", name: "Директор казначейства"},
    {id: "p13", name: "Администратор"}
];


export interface User {
    id: string;
    fullName: string;
    email?: string;
    password?: string[];
    positionId?: string; // Должность
    orgUnitId?: string; // СП
    role?: string[]; // Может быть несколько ролей
}

export const USERS: User[] = [
    {id: "osmonov", fullName: "Азамат Осмонов", positionId: "p1", orgUnitId: "26"}, // Управление рисками
    {id: "asanova", fullName: "Гульнара Асанова", positionId: "p2", orgUnitId: "34"}, // Юридическое управление
    {id: "toktos", fullName: "Бермет Токтосунова", positionId: "p3", orgUnitId: "33"}, // Управление методологии и продуктов
    {id: "imanaliev", fullName: "Тимур Иманалиев", positionId: "p4", orgUnitId: "35"}, // Административный отдел
    {id: "sydykov", fullName: "Эрлан Сыдыков", positionId: "p5", orgUnitId: "36"}, // Правление
    {id: "mamatova", fullName: "Айгуль Маматова", positionId: "p6", orgUnitId: "37"}, // Канцелярия
    {id: "kadyrov", fullName: "Бакыт Кадыров", positionId: "p7", orgUnitId: "38"}, // УБУиО
    {id: "abdiev", fullName: "Нурлан Абдиев", positionId: "p8", orgUnitId: "3"},  // Управление ИТ
    {id: "jumaeva", fullName: "Алия Жумаева", positionId: "p9", orgUnitId: "32"}, // Управление человеческими ресурсами
    {id: "ormonov", fullName: "Руслан Ормонов", positionId: "p10", orgUnitId: "39"}, // Департамент безопасности
    {id: "ibraeva", fullName: "Салтанат Ибраева", positionId: "p11", orgUnitId: "38"}, // УБУиО
    {id: "usenov", fullName: "Данияр Усенов", positionId: "p12", orgUnitId: "4"},  // Управление казначейских операций
    {id: "admin", fullName: "Администратор СЭД", positionId: "p13", orgUnitId: "3"},  // Управление ИТ
];


// Бермет Токтосунова - главный редактор