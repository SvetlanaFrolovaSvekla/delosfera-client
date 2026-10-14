/**
 * Шаблоны записки (СЗ-6): применить сохранённый пресет полей к новой записке или
 * сохранить текущую форму как шаблон. Показывается только при создании.
 *
 * Собрана из общих элементов: SelectDropdown (выбор шаблона), SzButton, поле ввода
 * в стиле карточки СЗ; все подписи — через переводы.
 */
import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {szTemplateService, type SzTemplate, type SzTemplatePayload} from "@/service/szService/szTemplateService.ts";
import type {SzSaveRequest} from "@/service/szService/szService.ts";
import {toast} from "@/service/toastService.ts";
import {serverMessage} from "@/utils/szProcess/szCardUtils.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {BookmarkPlus, LayoutTemplate, Settings2, Trash2} from "lucide-react";

interface Props {
    form: SzSaveRequest;
    onApply: (patch: Partial<SzSaveRequest>) => void;
    disabled?: boolean;
}

/**
 * Пресет из шаблона → патч формы: переносим только заданные шаблоном поля.
 * Пустое в шаблоне (null, "", []) значит «шаблон это поле не задаёт» — иначе шаблон,
 * сохранённый без адресата, стирал бы уже выбранного адресата, подписанта и т. д.
 */
function payloadToPatch(p: SzTemplatePayload): Partial<SzSaveRequest> {
    const patch: Partial<SzSaveRequest> = {};
    if (p.kindId) patch.kindId = p.kindId;
    if (p.title) patch.title = p.title;
    if (p.body) patch.body = p.body;
    if (p.correspondentUnitId != null) patch.correspondentUnitId = p.correspondentUnitId;
    if (p.addresseeUserId != null) patch.addresseeUserId = p.addresseeUserId;
    if (p.signerUserId != null) patch.signerUserId = p.signerUserId;
    if (p.approvalIsParallel != null) patch.approvalIsParallel = p.approvalIsParallel;
    if (p.isPaperCarrier != null) patch.isPaperCarrier = p.isPaperCarrier;
    if (p.rubricIds?.length) patch.rubricIds = p.rubricIds;
    if (p.approverUserIds?.length) patch.approverUserIds = p.approverUserIds;
    return patch;
}

/** Текущая форма → пресет шаблона: сохраняем то, что имеет смысл переносить. */
function formToPayload(f: SzSaveRequest): SzTemplatePayload {
    return {
        kindId: f.kindId || null,
        title: f.title || null,
        body: f.body ?? null,
        correspondentUnitId: f.correspondentUnitId ?? null,
        addresseeUserId: f.addresseeUserId ?? null,
        signerUserId: f.signerUserId ?? null,
        approvalIsParallel: f.approvalIsParallel ?? null,
        isPaperCarrier: f.isPaperCarrier ?? null,
        rubricIds: f.rubricIds ?? [],
        approverUserIds: f.approverUserIds ?? [],
    };
}

export function SzTemplateBar({form, onApply, disabled}: Props) {
    const {t} = useTranslation();
    const [templates, setTemplates] = useState<SzTemplate[]>([]);
    const [naming, setNaming] = useState(false);
    const [managing, setManaging] = useState(false);
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function reload() {
        try {
            setTemplates(await szTemplateService.list());
        } catch {
            /* список шаблонов не критичен для создания — молча пропускаем */
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void reload();
    }, []);

    function apply(id: number) {
        if (disabled) return;
        const tpl = templates.find((x) => x.id === id);
        if (!tpl) return;
        onApply(payloadToPatch(tpl.payload));
        toast.success(t("szCard.templates.appliedToast", {name: tpl.name, interpolation: {escapeValue: false}}));
    }

    async function save() {
        const trimmed = name.trim();
        if (!trimmed) {
            setError(t("szCard.templates.nameRequired"));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await szTemplateService.create(trimmed, formToPayload(form));
            setName("");
            setNaming(false);
            await reload();
            toast.success(t("szCard.templates.savedToast"));
        } catch (e: unknown) {
            setError(serverMessage(e) ?? t("szCard.templates.saveFailed"));
        } finally {
            setBusy(false);
        }
    }

    async function remove(id: number) {
        try {
            await szTemplateService.remove(id);
            await reload();
            toast.success(t("szCard.templates.removedToast"));
        } catch {
            setError(t("szCard.templates.removeFailed"));
        }
    }

    const hasTemplates = templates.length > 0;

    return (
        <div className="mt-5 rounded-[12px] border border-[#e5e9f0] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    <LayoutTemplate size={15}/>
                    {/* Шаблоны записки */}
                    {t("szCard.templates.title")}
                </span>

                {/* Применить шаблон */}
                <SelectDropdown
                    options={templates.map((tpl) => ({value: String(tpl.id), label: tpl.name}))}
                    value=""
                    onChange={(v) => v && apply(Number(v))}
                    placeholder={hasTemplates ? t("szCard.templates.applyPlaceholder") : t("szCard.templates.empty")}
                    searchable={templates.length > 7}
                    searchPlaceholder={t("szCard.templates.search")}
                    size="sm"
                    minWidth="240px"
                />

                {!naming ? (
                    <SzButton
                        variant="brandSoft"
                        size="sm"
                        className="gap-1.5"
                        disabled={disabled}
                        onClick={() => {
                            setNaming(true);
                            setError(null);
                        }}
                    >
                        <BookmarkPlus size={15}/>
                        {t("szCard.templates.saveAs")}
                    </SzButton>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") void save();
                                if (e.key === "Escape") { setNaming(false); setName(""); setError(null); }
                            }}
                            placeholder={t("szCard.templates.namePlaceholder")}
                            className="h-9 min-w-[220px] rounded-[9px] border border-[#e5e9f0] bg-white px-3 text-[13px] outline-none focus:border-[#2f68f5]"
                        />
                        <SzButton variant="primary" size="sm" onClick={() => void save()} disabled={busy}>
                            {busy ? t("szCard.templates.saving") : t("szCard.templates.save")}
                        </SzButton>
                        <SzButton
                            size="sm"
                            disabled={busy}
                            onClick={() => { setNaming(false); setName(""); setError(null); }}
                        >
                            {t("szCard.templates.cancel")}
                        </SzButton>
                    </div>
                )}

                {hasTemplates && (
                    <SzButton
                        size="sm"
                        className={`ml-auto gap-1.5 ${managing ? "!border-[#2f68f5] !text-[#2f68f5]" : ""}`}
                        onClick={() => setManaging((v) => !v)}
                    >
                        <Settings2 size={15}/>
                        {t("szCard.templates.manage")}
                    </SzButton>
                )}
            </div>

            {/* Управление: список шаблонов с удалением */}
            {managing && hasTemplates && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[#eef2f7] pt-3">
                    {templates.map((tpl) => (
                        <span
                            key={tpl.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e9f0] bg-[#f8fafc] py-1 pl-3 pr-1 text-[12.5px] text-[#3a4560]"
                        >
                            <span className="max-w-[240px] truncate">{tpl.name}</span>
                            <button
                                type="button"
                                title={t("szCard.templates.remove")}
                                onClick={() => void remove(tpl.id)}
                                className="grid h-6 w-6 cursor-pointer place-items-center rounded-full border-none bg-transparent text-[#a3adbd] hover:bg-[#fbeae7] hover:text-[#c0392b]"
                            >
                                <Trash2 size={13}/>
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {error && <div className="mt-2 text-[12.5px] text-[#c0392b]">{error}</div>}
        </div>
    );
}
