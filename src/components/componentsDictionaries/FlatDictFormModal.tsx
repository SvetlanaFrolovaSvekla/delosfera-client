// Универсальная модалка создания/редактирования плоского справочника (без иерархии)
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {useModalShake} from "@/hooks/useModalShake.ts";
import type {FlatDictFormValues} from "@/hooks/dictionariesHooks/useFlatDictList.ts";

import {X} from "lucide-react";

interface FlatDictFormModalProps {
    open: boolean;
    onClose: () => void;
    mode: "create" | "edit";
    initialValues: FlatDictFormValues;
    submitting: boolean;
    error: string | null;
    onSubmit: (values: FlatDictFormValues) => void;
    // Ожидаемые ключи: formTitleCreate, formTitleEdit, fieldTitleRu, fieldTitleEn, fieldTitleKg
    pageKey: string;
}

export function FlatDictFormModal({
                                      open,
                                      onClose,
                                      mode,
                                      initialValues,
                                      submitting,
                                      error,
                                      onSubmit,
                                      pageKey,
                                  }: FlatDictFormModalProps) {
    const {t} = useTranslation();
    const {panelRef, handleBackdropClick} = useModalShake();
    const [values, setValues] = useState<FlatDictFormValues>(initialValues);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (open) setValues(initialValues);
    }, [open, initialValues]);

    if (!open) return null;

    const canSubmit = values.titleRu.trim().length > 0 && !submitting;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit({
            titleRu: values.titleRu.trim(),
            titleEn: values.titleEn.trim(),
            titleKg: values.titleKg.trim(),
        });
    };

    return (
        <div
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-[rgba(15,27,45,.42)] flex items-center justify-center p-4"
        >
            <div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-[440px] bg-white rounded-2xl shadow-[0_24px_60px_-20px_rgba(15,27,45,.5)] overflow-hidden"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#eef2f7]">
                    <h3 className="m-0 text-[15px] font-semibold text-[#1c2740]">
                        {mode === "create" ? t(`${pageKey}.formTitleCreate`) : t(`${pageKey}.formTitleEdit`)}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 grid place-items-center rounded-full text-[#a3adbd] hover:bg-[#f2f5f9] hover:text-[#55617a] cursor-pointer"
                    >
                        <X className="w-[16px] h-[16px]" strokeWidth={2}/>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3.5">
                    <div>
                        <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                            {t("dictionaries.fieldTitleRu")} <span className="text-[#c0392b]">*</span>
                        </span>
                        <input
                            autoFocus
                            value={values.titleRu}
                            onChange={(e) => setValues((v) => ({...v, titleRu: e.target.value}))}
                            className="w-full h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                        />
                    </div>

                    <div>
                        <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                            {t("dictionaries.fieldTitleEn")}
                        </span>
                        <input
                            value={values.titleEn}
                            onChange={(e) => setValues((v) => ({...v, titleEn: e.target.value}))}
                            className="w-full h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                        />
                    </div>

                    <div>
                        <span className="block text-[12px] font-semibold text-[#3a4560] mb-2">
                           {t("dictionaries.fieldTitleKg")}
                        </span>
                        <input
                            value={values.titleKg}
                            onChange={(e) => setValues((v) => ({...v, titleKg: e.target.value}))}
                            className="w-full h-9 px-3 rounded-[9px] border border-[#e5e9f0] bg-white text-[13px] text-[#1c2740] outline-none focus:border-[#4e57d6]"
                        />
                    </div>

                    {error && (
                        <div className="px-3 py-2 rounded-[9px] bg-[#fdeceb] text-[#c0392b] text-[12.5px]">
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[#eef2f7]">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="h-9 px-4 rounded-[9px] border border-[#e5e9f0] bg-white text-[#55617a] font-semibold text-[12.5px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {t("general.cancel")}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className="h-9 px-5 rounded-[9px] border-none bg-[#4e57d6] text-white font-semibold text-[12.5px] cursor-pointer hover:brightness-[1.06] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {submitting ? t("general.saving") : t("general.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}