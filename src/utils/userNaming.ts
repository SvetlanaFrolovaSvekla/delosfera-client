/**
 * Имя и фамилия для обращения к человеку: «Чынгыз Божокоев».
 *
 * В каталоге и в карточке ФИО записано наоборот — «Божокоев Чынгыз», как в
 * документах. Обращаться так к живому человеку неестественно, поэтому в
 * приветствии фамилия уходит назад.
 *
 * Отчество опускается: в приветствии оно избыточно, а с ним строка становится
 * длиннее заголовка.
 */
export function getFirstLastName(fullName?: string): string {
    if (!fullName) return "";

    const parts = fullName.trim().split(/\s+/);
    if (parts.length < 2) return parts[0] ?? "";

    const [lastName, firstName] = parts;
    return `${firstName} ${lastName}`;
}
