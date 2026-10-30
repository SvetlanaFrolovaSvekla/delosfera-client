// Подписанты договора о материальной ответственности от имени Банка. Основной — Председатель
// Правления из настроек маршрута УЧР («Подписант приказов о замещении по Головному офису»), он
// подписывает по умолчанию. Делопроизводитель (право «Корректировать заявки на замещение») или УЧР
// может добавить дополнительных подписантов — тогда в договоре они все указаны в «в лице …» и в
// строках подписей, и каждому уходит задача на подпись. Если договор уже зафиксирован, он
// перевыпускается новой версией.
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {Plus} from "lucide-react";
import {
    substitutionService,
    type SubstitutionDetails,
} from "@/service/substitutionService/substitutionService.ts";
import type {PickableUser} from "@/constants/pickableUser.ts";
import {SzFormSection} from "@/components/componentsSz/componentsSzCard/form/SzFormSection.tsx";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {UserOrgUnitPickerModal} from "@/components/componentsGeneral/userPicker/UserOrgUnitPickerModal.tsx";
import {toast} from "@/service/toastService.ts";
import {PersonRow, personMeta} from "./SubstitutionPersonField.tsx";

interface Props {
    details: SubstitutionDetails;
    users: PickableUser[];
    /** Карточка после сохранения (сервер отдаёт её целиком). */
    onSaved: (details: SubstitutionDetails) => void;
}

export function SubstitutionBankSignersSection({details, users, onSaved}: Props) {
    const {t} = useTranslation();
    const [picking, setPicking] = useState(false);
    const [busy, setBusy] = useState(false);
    const canEdit = !!details.access?.canEditBankSigners;
    const signers = details.bankSigners ?? [];
    const main = signers.find((s) => s.isMain);
    const extras = signers.filter((s) => !s.isMain);

    async function save(userIds: number[]) {
        setBusy(true);
        try {
            const d = await substitutionService.setBankSigners(details.id, userIds);
            onSaved(d);
            toast.success(t("substitutionBankSigners.saved"));
        } catch (e) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(t("substitutionBankSigners.saveFailed"), message);
        } finally {
            setBusy(false);
        }
    }

    const extraIds = details.extraBankSignerUserIds ?? extras.map((s) => s.userId);
    const metaOf = (userId: number, position: string | null) => personMeta(users.find((u) => u.id === userId), position);

    return (
        <SzFormSection title={t("substitutionBankSigners.title")} hint={t("substitutionBankSigners.hint")}>
            <div className="flex flex-col gap-2">
                <div className="text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#8b97ab]">
                    {t("substitutionBankSigners.main")}
                </div>
                {main ? (
                    <PersonRow name={main.fullName} meta={metaOf(main.userId, main.position)} userId={main.userId}/>
                ) : (
                    <div className="rounded-[9px] border border-dashed border-[#e5c48a] bg-[#fffaf0] px-3 py-2 text-[12.5px] text-[#b3730a]">
                        {t("substitutionBankSigners.noMain")}
                    </div>
                )}

                <div className="mt-2 text-[11.5px] font-semibold uppercase tracking-[.04em] text-[#8b97ab]">
                    {t("substitutionBankSigners.extra")}
                </div>
                {extras.length === 0 && (
                    <div className="text-[12.5px] text-[#8b97ab]">{t("substitutionBankSigners.noExtra")}</div>
                )}
                {extras.map((s) => (
                    <PersonRow key={s.userId} name={s.fullName} meta={metaOf(s.userId, s.position)} userId={s.userId}
                               onClear={canEdit && !busy ? () => void save(extraIds.filter((id) => id !== s.userId)) : undefined}
                               clearLabel={t("substitutionBankSigners.remove")}/>
                ))}
                {canEdit && (
                    <div>
                        <SzButton size="xs" variant="brandSoft" icon={<Plus size={14}/>} disabled={busy}
                                  onClick={() => setPicking(true)}>
                            {t("substitutionBankSigners.add")}
                        </SzButton>
                    </div>
                )}
                <div className="text-[11.5px] leading-[1.5] text-[#8b97ab]">
                    {canEdit ? t("substitutionBankSigners.editHint") : t("substitutionBankSigners.readOnlyHint")}
                </div>
            </div>

            {picking && (
                <UserOrgUnitPickerModal
                    people={users.filter((u) => u.id !== main?.userId && !extraIds.includes(u.id))}
                    title={t("substitutionBankSigners.pickTitle")}
                    searchPlaceholder={t("substitutionCard.fields.findEmployee")}
                    onSelect={(p) => void save([...extraIds, p.id])}
                    onClose={() => setPicking(false)}
                    accent="blue"
                    bySeniority
                    avatars
                />
            )}
        </SzFormSection>
    );
}
