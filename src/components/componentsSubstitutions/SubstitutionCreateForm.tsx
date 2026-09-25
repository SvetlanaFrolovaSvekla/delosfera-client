/** Форма оформления замещения. */
import {useTranslation} from "react-i18next";
import {parseDDMMYYYY} from "@/utils/dateUtils.ts";
import {UserPickerField} from "@/components/componentsGeneral/userPicker/UserPickerField.tsx";
import type {OrgUnitPickerPerson} from "@/components/componentsGeneral/userPicker/UserOrgUnitPickerModal.tsx";
import {Tooltip} from "@/components/componentsGeneral/Tooltip.tsx";
import {DatePickerInput} from "@/components/componentsGeneral/datePickers/DatePickerInput.tsx";

type PersonOption = OrgUnitPickerPerson;

export interface SubstitutionFormState {
    userId: number;
    substituteUserId: number;
    startsOn: string; // ISO, гггг-мм-дд — формат, который ждёт бэкенд
    endsOn: string;
    reason: string;
}

interface SubstitutionCreateFormProps {
    people: PersonOption[];
    form: SubstitutionFormState;
    onChange: (form: SubstitutionFormState) => void;
    formIssue: string | null;
    busy: boolean;
    onSubmit: () => void;
}

const isoToDisplay = (iso: string): string => {
    if (!iso) return "";
    const [year, month, day] = iso.split("-");
    return year && month && day ? `${day}.${month}.${year}` : "";
};

const displayToIso = (display: string): string => {
    const date = parseDDMMYYYY(display);
    if (!date) return "";
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export function SubstitutionCreateForm({
                                           people,
                                           form,
                                           onChange,
                                           formIssue,
                                           busy,
                                           onSubmit,
                                       }: SubstitutionCreateFormProps) {
    const {t} = useTranslation();

    return (
        <div className="bg-white border border-[#e9edf3] rounded-[14px] overflow-hidden">
            <div className="flex items-center justify-between px-[22px] py-[17px] border-b border-[#eef2f7]">
                <div>
                    <h2 className="m-0 text-[16px] font-bold text-[#1c2740]">
                        {t("substitutions.createTitle") /* Оформить замещение */}
                    </h2>
                    <div className="text-[12px] text-[#8b97ab] mt-0.5">
                        {t("substitutions.createSubtitle") /* Действует только в указанные дни */}
                    </div>
                </div>
            </div>

            <div className="px-[22px] pt-[10px] pb-[18px]">
                {formIssue && (
                    <div className="mb-4 text-[12px] text-[#8b97ab]">{formIssue}</div>
                )}
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">
                            {t("substitutions.fieldSubstituted") /* Кого замещают */}
                        </span>
                        <UserPickerField
                            people={people}
                            value={form.userId}
                            onChange={(id) => onChange({...form, userId: id})}
                            placeholder={t("substitutions.employeePlaceholder") /* — сотрудник — */}
                            modalTitle={t("substitutions.pickEmployeeTitle") /* Кого замещают */}
                            searchPlaceholder={t("substitutions.searchEmployee") /* Поиск по ФИО */}
                            excludeId={form.substituteUserId || undefined}
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">
                            {t("substitutions.fieldSubstitute") /* Кто замещает */}
                        </span>
                        <UserPickerField
                            people={people}
                            value={form.substituteUserId}
                            onChange={(id) => onChange({...form, substituteUserId: id})}
                            placeholder={t("substitutions.substitutePlaceholder") /* — замещающий — */}
                            modalTitle={t("substitutions.pickSubstituteTitle") /* Кто замещает */}
                            searchPlaceholder={t("substitutions.searchEmployee") /* Поиск по ФИО */}
                            excludeId={form.userId || undefined}
                        />
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">
                            {t("substitutions.fieldFrom") /* С */}
                        </span>
                        <div className="w-[150px]">
                            <DatePickerInput
                                value={isoToDisplay(form.startsOn)}
                                onChange={(v) => onChange({...form, startsOn: displayToIso(v)})}
                            />
                        </div>
                    </label>

                    <label className="flex flex-col gap-1.5">
                        <span className="text-[11.5px] text-[#8b97ab]">
                            {t("substitutions.fieldTo") /* По */}
                        </span>
                        <div className="w-[150px]">
                            <DatePickerInput
                                value={isoToDisplay(form.endsOn)}
                                onChange={(v) => onChange({...form, endsOn: displayToIso(v)})}
                            />
                        </div>
                    </label>
                </div>

                {/* Основание — во всю ширину и пониже поля ввода: одну строку тут
                    обычно не умещают ("отпуск с 12 по 26 числа по графику, приказ №..."),
                    а обрезанный текст потом сверяют по карточке замещения. */}
                <label className="mt-3 flex flex-col gap-1.5">
                    <span className="text-[11.5px] text-[#8b97ab]">
                        {t("substitutions.fieldReason") /* Основание */}
                    </span>
                    <textarea
                        rows={3}
                        className="min-h-[72px] w-full resize-y rounded-[9px] border border-[#e5e9f0] bg-white px-3 py-2.5 text-[13px] outline-none focus:border-[#2f68f5]"
                        placeholder={t("substitutions.reasonPlaceholder") /* отпуск, больничный, командировка */}
                        value={form.reason}
                        onChange={(e) => onChange({...form, reason: e.target.value})}
                    />
                </label>
            </div>

            <div className="flex justify-end gap-2.5 px-[22px] py-[15px] border-t border-[#eef2f7]">
                <Tooltip
                    side="top"
                    content={
                        formIssue
                        ?? (t("substitutions.submitHint") /* Замещающий увидит задачи согласования с указанной даты и до её окончания */)
                    }
                >
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={busy || !!formIssue}
                        className="h-10 px-[18px] rounded-[10px] border-none bg-[#4e57d6] text-white font-semibold text-[13px] cursor-pointer shadow-[0_6px_16px_-6px_#4e57d6] hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {t("substitutions.submit") /* Оформить */}
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}