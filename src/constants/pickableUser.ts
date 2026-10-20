/**
 * Сотрудник в списках выбора и порядок «по старшинству».
 *
 * Порядок значим для согласующих: Положение и практика ведут визу сверху вниз —
 * Правление, затем руководитель, затем остальные. Поэтому там, где подбирают
 * согласующих и подписанта, список не алфавитный, а по старшинству; внутри
 * группы — по алфавиту.
 */
export interface PickableUser {
    id: number;
    fullName: string;
    position?: string | null;
    orgUnit?: string | null;
    orgUnitId?: number | null;
    /** Председатель Правления — идёт первым в подборе. */
    isChairman?: boolean;
    /** Член Правления — идёт следом за председателем. */
    isBoardMember?: boolean;
    /** Руководит подразделением — идёт вторым. */
    isUnitHead?: boolean;
}

/** Старшинство: председатель → Правление → руководители → остальные. */
export function seniority(u: PickableUser): number {
    if (u.isChairman) return 0;
    if (u.isBoardMember) return 1;
    if (u.isUnitHead) return 2;
    return 3;
}

/** Заголовки групп старшинства; индекс — значение seniority(). Председатель и Правление — одна группа. */
export const SENIORITY_GROUP_TITLE = ["Правление", "Правление", "Руководители подразделений", "Остальные"] as const;
