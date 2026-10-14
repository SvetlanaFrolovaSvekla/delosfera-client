/**
 * Массовая сдача записок в архив (СЗ-7): вся отобранная пачка подшивается в одно
 * дело номенклатуры. Часть записок может не пройти проверку (не исполнена, оригинал
 * на руках) — итог показывает, сколько прошло и что не прошло, поимённо.
 *
 * Собрано из тех же элементов, что и «Архивное хранение» в карточке (SzArchivePanel):
 * дело — SingleSelectListField (окно с поиском), срок — SelectDropdown, кнопки — SzButton,
 * все подписи — через переводы.
 */
import {useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {
    szArchiveService,
    type NomenclatureCase,
    type StorageTerm,
    type SzBulkResult,
} from "@/service/szService/szArchiveService.ts";
import {serverMessage} from "@/utils/szProcess/szCardUtils.ts";
import {SzButton} from "@/components/componentsSz/componentsSzCard/controls/SzButton.tsx";
import {SingleSelectListField} from "@/components/componentsGeneral/selects/SingleSelects/SingleSelectListField.tsx";
import {SelectDropdown} from "@/components/componentsGeneral/selects/SingleSelects/SelectDropdown.tsx";
import {Archive} from "lucide-react";

interface Props {
    ids: number[];
    onClose: () => void;
    onDone: (result: SzBulkResult) => void;
}

export function SzBulkArchiveModal({ids, onClose, onDone}: Props) {
    const {t} = useTranslation();

    // Пачку запоминаем при открытии: реестр после onDone сбрасывает выделение, и без
    // этого на экране итога было бы «Отобрано записок: 0».
    const [batch] = useState(() => [...ids]);
    const [cases, setCases] = useState<NomenclatureCase[]>([]);
    const [terms, setTerms] = useState<StorageTerm[]>([]);
    const [caseId, setCaseId] = useState(0);
    const [termId, setTermId] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<SzBulkResult | null>(null);

    useEffect(() => {
        let alive = true;
        Promise.all([szArchiveService.cases(), szArchiveService.storageTerms()])
            .then(([c, s]) => {
                if (!alive) return;
                setCases(c.filter((x) => x.isActive));
                setTerms(s);
            })
            .catch(() => alive && setError(t("szRegistry.bulkArchive.loadFailed")));
        return () => {
            alive = false;
        };
    }, [t]);

    // Индекса у дела может не быть — тогда только название, без «null · …».
    const caseOptions = useMemo(
        () => cases.map((c) => ({
            key: String(c.id),
            label: [c.index, c.titleRu].filter(Boolean).join(" · ") + (c.year ? ` (${c.year})` : ""),
        })),
        [cases],
    );

    const termOptions = useMemo(
        () => [
            {value: "", label: t("szRegistry.bulkArchive.termFromCase")},
            ...terms.map((x) => ({value: String(x.id), label: `${x.code} — ${x.titleRu}`})),
        ],
        [terms, t],
    );

    async function submit() {
        if (!caseId) {
            setError(t("szRegistry.bulkArchive.caseRequired"));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const res = await szArchiveService.bulkArchive(batch, caseId, termId === "" ? null : Number(termId));
            setResult(res);
            onDone(res);
        } catch (e: unknown) {
            setError(serverMessage(e) ?? t("szRegistry.bulkArchive.failed"));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div
            // Пока идёт подшивка, клик мимо окна его не закрывает: итог иначе потерялся бы.
            onClick={() => {
                if (!busy) onClose();
            }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,27,45,.4)] p-4"
        >
            {/* Без overflow у самого окна: выпадающий список срока позиционируется
                абсолютно и обрезался бы прокручиваемой панелью. */}
            <div
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="flex w-[min(520px,100%)] flex-col gap-3.5 rounded-[14px] bg-white p-5 shadow-[0_20px_60px_-20px_rgba(15,27,45,.5)]"
            >
                <div>
                    <h2 className="m-0 flex items-center gap-2 text-[16px] font-bold text-[#0f1b2d]">
                        <Archive size={17} className="text-[#55617a]"/>
                        {/* Сдать в архив */}
                        {t("szRegistry.bulkArchive.title")}
                    </h2>
                    <div className="mt-1 text-[12.5px] text-[#8b97ab]">
                        {/* Отобрано записок: {n} */}
                        {t("szRegistry.bulkArchive.selected", {count: batch.length})}
                    </div>
                </div>

                {!result ? (
                    <>
                        {/* Дело номенклатуры */}
                        <SingleSelectListField
                            label={t("szRegistry.bulkArchive.caseLabel")}
                            required
                            boldLabel={false}
                            modalTitle={t("szRegistry.bulkArchive.caseModalTitle")}
                            placeholder={t("szRegistry.bulkArchive.casePlaceholder")}
                            searchPlaceholder={t("szRegistry.bulkArchive.caseSearch")}
                            options={caseOptions}
                            selectedKey={caseId ? String(caseId) : null}
                            onChange={(key) => setCaseId(key ? Number(key) : 0)}
                        />

                        {/* Срок хранения — необязательно, по умолчанию из дела */}
                        <div className="min-w-0">
                            <span className="mb-[5px] block text-[11.5px] text-[#8b97ab]">
                                {t("szRegistry.bulkArchive.termLabel")}
                                <span className="text-[#a3adbd]"> · {t("szRegistry.bulkArchive.termOptional")}</span>
                            </span>
                            <SelectDropdown
                                options={termOptions}
                                value={termId}
                                onChange={setTermId}
                                minWidth="100%"
                                className="w-full"
                            />
                        </div>

                        {error && <div className="text-[12.5px] text-[#c0392b]">{error}</div>}

                        <div className="flex justify-end gap-2">
                            <SzButton size="sm" onClick={onClose} disabled={busy}>
                                {t("szRegistry.bulkArchive.cancel")}
                            </SzButton>
                            <SzButton variant="primary" size="sm" onClick={() => void submit()} disabled={busy}>
                                {busy
                                    ? t("szRegistry.bulkArchive.submitting")
                                    : t("szRegistry.bulkArchive.submit", {count: batch.length})}
                            </SzButton>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="text-[13px] text-[#0f1b2d]">
                            {/* Подшито в дело: {succeeded} из {requested} */}
                            {t("szRegistry.bulkArchive.resultPrefix")}{" "}
                            <b className="text-[#1f8a4c]">{result.succeeded}</b>{" "}
                            {t("szRegistry.bulkArchive.resultOf", {requested: result.requested})}
                        </div>

                        {result.failed.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                                <div className="text-[12.5px] font-semibold text-[#c0392b]">
                                    {t("szRegistry.bulkArchive.failedTitle", {count: result.failed.length})}
                                </div>
                                {/* Прокручивается только список: длинная пачка не растягивает окно. */}
                                <div className="flex max-h-[40vh] flex-col gap-1.5 overflow-auto">
                                    {result.failed.map((f) => (
                                        <div key={f.szId} className="text-[12px] text-[#55617a]">
                                            <span className="font-mono">{f.regNumber ?? `#${f.szId}`}</span> — {f.message}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <SzButton variant="primary" size="sm" onClick={onClose}>
                                {t("szRegistry.bulkArchive.done")}
                            </SzButton>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
