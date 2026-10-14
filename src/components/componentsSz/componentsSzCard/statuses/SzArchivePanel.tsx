/**
 * Архивное хранение (SZ-07): подшивка в дело номенклатуры, срок хранения,
 * год уничтожения. Показывается, когда работа по записке закончена.
 *
 * Оформлена как остальные панели карточки СЗ: серый заголовок капсом, SzButton,
 * выбор дела — через SingleSelectListField (окно с поиском), срок — SelectDropdown.
 */
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    szArchiveService,
    type NomenclatureCase,
    type StorageTerm,
    type SzArchive,
} from "@/service/szService/szArchiveService.ts";
import {toast} from "@/service/toastService.ts";
import {formatDate, serverMessage} from "@/utils/szProcess/szCardUtils.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {Archive, RotateCcw} from "lucide-react";
import {colors} from "@/design/tokens.ts";

interface Props {
    szId: number;
    statusCode: string;
    onChanged: () => Promise<void> | void;
}

export function SzArchivePanel({szId, statusCode, onChanged}: Props) {
    const {t} = useTranslation();
    const [archive, setArchive] = useState<SzArchive | null>(null);
    const [cases, setCases] = useState<NomenclatureCase[]>([]);
    const [terms, setTerms] = useState<StorageTerm[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [caseId, setCaseId] = useState(0);
    const [termId, setTermId] = useState("");

    const load = useCallback(async () => {
        try {
            setArchive(await szArchiveService.get(szId));
        } catch {
            setError(t("szCard.archive.loadFailed"));
        }
    }, [szId, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        szArchiveService.cases().then(setCases).catch(() => setCases([]));
        szArchiveService.storageTerms().then(setTerms).catch(() => setTerms([]));
    }, []);

    const caseOptions = useMemo(
        () => cases.map((c) => ({key: String(c.id), label: `${c.index} · ${c.titleRu} (${c.year})`})),
        [cases],
    );

    const termOptions = useMemo(
        () => [
            {value: "", label: t("szCard.archive.termFromCase")},
            ...terms.map((x) => ({value: String(x.id), label: x.titleRu})),
        ],
        [terms, t],
    );

    const run = async (action: () => Promise<unknown>, fallback: string, successMessage: string) => {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
            await onChanged();
            toast.success(successMessage);
        } catch (e) {
            setError(serverMessage(e) ?? fallback);
        } finally {
            setBusy(false);
        }
    };

    const archived = archive?.isArchived ?? false;
    // Подшивают документ, работа по которому закончена.
    const canArchive = ["Executed", "Rejected", "Withdrawn"].includes(statusCode);

    if (!archived && !canArchive) return null;

    const submitArchive = () => {
        if (!caseId) {
            setError(t("szCard.archive.caseRequired"));
            return;
        }
        void run(async () => {
            await szArchiveService.archive(szId, caseId, termId === "" ? null : Number(termId));
            setFormOpen(false);
            setCaseId(0);
            setTermId("");
        }, t("szCard.archive.archiveFailed"), t("szCard.archive.archivedToast"));
    };

    return (
        <div className="mt-4 rounded-[12px] border border-[#e5e9f0] bg-white p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#a3adbd]">
                    {/* Архивное хранение */}
                    {t("szCard.archive.title")}
                </div>
                <span className="text-[12.5px] font-semibold"
                      style={{color: archived ? colors.ryg.green.fg : colors.inkSubtle}}>
                    {archived
                        ? t("szCard.archive.inCaseSince", {date: formatDate(archive?.archivedOn)})
                        : t("szCard.archive.notArchived")}
                </span>
            </div>

            {error && (
                <div className="mb-3 rounded-[10px] border border-[#f1c9c2] bg-[#fbeae7] px-4 py-2.5 text-[13px] text-[#c0392b]">
                    {error}
                </div>
            )}

            {archived && archive ? (
                <>
                    <div className="rounded-[10px] border border-[#eef2f7] bg-[#f8fafc] px-4 py-3 text-[13px]">
                        <div className="text-[#1c2740]">
                            {t("szCard.archive.case", {
                                index: archive.caseIndex,
                                title: archive.caseTitle,
                                interpolation: {escapeValue: false},
                            })}
                        </div>
                        <div className="mt-0.5 text-[12.5px] text-[#8b97ab]">
                            {t("szCard.archive.storageTerm", {term: archive.storageTerm ?? "—", interpolation: {escapeValue: false}})}
                            {archive.caseClosedOn && ` · ${t("szCard.archive.caseClosed", {date: formatDate(archive.caseClosedOn)})}`}
                        </div>
                        <div className="mt-0.5 text-[12.5px]"
                             style={{color: archive.destroyYearPending ? colors.ryg.amber.fg : colors.inkSubtle}}>
                            {archive.storageYears == null
                                ? t("szCard.archive.permanent")
                                : archive.destroyAfterYear != null
                                    ? t("szCard.archive.destroyAfter", {year: archive.destroyAfterYear})
                                    : t("szCard.archive.destroyPending")}
                        </div>
                    </div>
                    <SzButton
                        size="sm"
                        className="mt-3 gap-1.5"
                        disabled={busy}
                        onClick={() => void run(
                            () => szArchiveService.restore(szId),
                            t("szCard.archive.restoreFailed"),
                            t("szCard.archive.restoredToast"),
                        )}
                    >
                        <RotateCcw size={15}/>
                        {t("szCard.archive.restore")}
                    </SzButton>
                </>
            ) : (
                <>
                    <div className="text-[13px] text-[#8b97ab]">{t("szCard.archive.canArchiveHint")}</div>

                    {!formOpen && (
                        <SzButton size="sm" className="mt-3 gap-1.5" onClick={() => setFormOpen(true)}>
                            <Archive size={15}/>
                            {t("szCard.archive.archive")}
                        </SzButton>
                    )}

                    {formOpen && (
                        <div className="mt-3 rounded-[12px] border border-[#cbddff] bg-[#f5f8ff] p-4">
                            <div className="grid grid-cols-[minmax(0,1fr)_260px] gap-3">
                                {/* Дело номенклатуры */}
                                <SingleSelectListField
                                    label={t("szCard.archive.caseLabel")}
                                    required
                                    boldLabel={false}
                                    modalTitle={t("szCard.archive.caseModalTitle")}
                                    placeholder={t("szCard.archive.casePlaceholder")}
                                    searchPlaceholder={t("szCard.archive.caseSearch")}
                                    options={caseOptions}
                                    selectedKey={caseId ? String(caseId) : null}
                                    onChange={(key) => setCaseId(key ? Number(key) : 0)}
                                />
                                {/* Срок хранения — пусто: как в деле */}
                                <div className="min-w-0">
                                    <span className="mb-[5px] block text-[11.5px] text-[#8b97ab]">
                                        {t("szCard.archive.termLabel")}
                                    </span>
                                    <SelectDropdown
                                        options={termOptions}
                                        value={termId}
                                        onChange={setTermId}
                                        minWidth="100%"
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                                <SzButton variant="primary" size="sm" onClick={submitArchive} disabled={busy}>
                                    {t("szCard.archive.confirmArchive")}
                                </SzButton>
                                <SzButton size="sm" onClick={() => setFormOpen(false)}>
                                    {t("szCard.archive.cancel")}
                                </SzButton>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
