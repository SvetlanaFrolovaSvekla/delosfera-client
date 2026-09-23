// "Нормотворчество (ВНД)" → "Предложения по ВНД": входящие предложения сотрудников по изменению
// и дополнению ВНД (см. VndProposalModal на странице открытого ВНД). Видна получателям с правом
// ManageVndProposals (главный редактор ВНД). Статус "прочитано" общий для всех получателей.
//
// Карточка раскрывается по клику - при этом непрочитанное предложение сразу отмечается
// прочитанным. Переход из уведомления (?id=...) открывает и подсвечивает нужное предложение.
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {useTranslation} from "react-i18next";

import {
    notifyVndProposalsChanged,
    vndProposalService,
    type VndProposal,
    type VndProposalCounts,
    type VndProposalStatusFilter,
} from "@/service/vndProposalService/vndProposalService.ts";
import {formatFileSize} from "@/service/documentService/attachmentService.ts";
import {toast} from "@/service/toastService.ts";
import {downloadWithToast} from "@/utils/downloadFiles/downloadFile.ts";
import {formatDateTime, formatRelativeTime} from "@/utils/dateUtils.ts";

import {PageHeader} from "@/components/componentsGeneral/PageHeader.tsx";
import {SearchBar} from "@/components/componentsGeneral/SearchBar.tsx";
import {Loader} from "@/components/componentsGeneral/Loader.tsx";
import {EmptyState} from "@/components/componentsGeneral/EmptyState.tsx";
import {Tabs} from "@/components/componentsGeneral/Tabs.tsx";

import {
    CheckCheck,
    ChevronDown,
    Download,
    ExternalLink,
    FileText,
    Inbox,
    Lightbulb,
    Loader2,
    Mail,
    MailOpen,
    Paperclip,
    Quote,
} from "lucide-react";

const PAGE_SIZE = 20;

/** Цвета аватаров - стабильно по id автора. */
const AVATAR_COLORS = [
    ["#ececfc", "#4e57d6"],
    ["#e6f4ec", "#1c7a4d"],
    ["#fdf3e0", "#b3730a"],
    ["#fdecec", "#c0392b"],
    ["#e8f3fb", "#1f6fa8"],
    ["#f3ecfb", "#7b3fc4"],
] as const;

function initials(fullName: string): string {
    return fullName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export function VndProposalsPage() {
    const {t} = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const focusId = Number(searchParams.get("id")) || null;

    const [status, setStatus] = useState<VndProposalStatusFilter>("all");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");

    const [items, setItems] = useState<VndProposal[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [counts, setCounts] = useState<VndProposalCounts>({total: 0, unread: 0});

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [highlightId, setHighlightId] = useState<number | null>(null);
    const cardRefs = useRef(new Map<number, HTMLDivElement>());

    // Поиск - с небольшой задержкой, чтобы не дёргать сервер на каждую букву.
    useEffect(() => {
        const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadCounts = useCallback(async () => {
        try {
            setCounts(await vndProposalService.counts());
        } catch {
            // счётчики не критичны
        }
    }, []);

    const load = useCallback(async (nextPage: number) => {
        const append = nextPage > 1;
        if (append) setLoadingMore(true); else setLoading(true);
        setError(null);
        try {
            const result = await vndProposalService.list({
                status, search: search || undefined, page: nextPage, pageSize: PAGE_SIZE,
            });
            setItems((prev) => {
                if (!append) return result.items;
                const known = new Set(prev.map((p) => p.id));
                return [...prev, ...result.items.filter((p) => !known.has(p.id))];
            });
            setTotalCount(result.totalCount);
            setPage(nextPage);
        } catch {
            setError(t("vndProposals.page.loadError"));
        } finally {
            if (append) setLoadingMore(false); else setLoading(false);
        }
    }, [status, search, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load(1);
    }, [load]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadCounts();
    }, [loadCounts]);

    const replaceItem = (updated: VndProposal) =>
        setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

    const setReadState = async (proposal: VndProposal, read: boolean) => {
        if (proposal.isRead === read) return;
        setBusyId(proposal.id);
        try {
            const updated = read
                ? await vndProposalService.markAsRead(proposal.id)
                : await vndProposalService.markAsUnread(proposal.id);
            replaceItem(updated);
            setCounts((c) => ({...c, unread: Math.max(0, c.unread + (read ? -1 : 1))}));
            notifyVndProposalsChanged();
        } catch {
            // оставляем как есть - кнопку можно нажать ещё раз
        } finally {
            setBusyId(null);
        }
    };

    const toggleExpanded = (proposal: VndProposal) => {
        const willExpand = !expanded.has(proposal.id);
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(proposal.id)) next.delete(proposal.id); else next.add(proposal.id);
            return next;
        });
        if (willExpand && !proposal.isRead) void setReadState(proposal, true);
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await vndProposalService.markAllAsRead();
            toast.success(t("vndProposals.page.markAllReadDone"));
            notifyVndProposalsChanged();
            await Promise.all([load(1), loadCounts()]);
        } finally {
            setMarkingAll(false);
        }
    };

    // Переход из уведомления: ?id=... - показываем это предложение (даже если оно не попало на
    // первую страницу списка), раскрываем, подсвечиваем и отмечаем прочитанным.
    const handledFocusRef = useRef<number | null>(null);
    useEffect(() => {
        if (!focusId || loading || handledFocusRef.current === focusId) return;
        handledFocusRef.current = focusId;
        (async () => {
            let proposal = items.find((p) => p.id === focusId);
            if (!proposal) {
                try {
                    proposal = await vndProposalService.getById(focusId);
                    const found = proposal;
                    setItems((prev) => [found, ...prev.filter((p) => p.id !== found.id)]);
                } catch {
                    return;
                }
            }
            setExpanded((prev) => new Set(prev).add(focusId));
            setHighlightId(focusId);
            if (!proposal.isRead) {
                try {
                    const updated = await vndProposalService.markAsRead(focusId);
                    replaceItem(updated);
                    setCounts((c) => ({...c, unread: Math.max(0, c.unread - 1)}));
                    notifyVndProposalsChanged();
                } catch {
                    // не критично
                }
            }
            requestAnimationFrame(() =>
                cardRefs.current.get(focusId)?.scrollIntoView({block: "center", behavior: "smooth"}));
            // Убираем ?id= из адреса, чтобы обновление страницы не "прыгало" снова к карточке.
            const params = new URLSearchParams(searchParams);
            params.delete("id");
            setSearchParams(params, {replace: true});
        })();
    }, [focusId, loading, items, searchParams, setSearchParams]);

    useEffect(() => {
        if (highlightId === null) return;
        const timer = setTimeout(() => setHighlightId(null), 2500);
        return () => clearTimeout(timer);
    }, [highlightId]);

    const tabs = useMemo(() => ([
        {id: "all" as const, label: t("vndProposals.page.tabAll"), n: counts.total},
        {id: "unread" as const, label: t("vndProposals.page.tabUnread"), n: counts.unread, icon: <Mail size={14}/>},
        {id: "read" as const, label: t("vndProposals.page.tabRead"), n: Math.max(0, counts.total - counts.unread), icon: <MailOpen size={14}/>},
    ]), [counts, t]);

    const emptyTitle = search
        ? t("vndProposals.page.emptySearchTitle")
        : status === "unread"
            ? t("vndProposals.page.emptyUnreadTitle")
            : t("vndProposals.page.emptyTitle");
    const emptyDescription = search
        ? t("vndProposals.page.emptySearchDescription")
        : t("vndProposals.page.emptyDescription");

    return (
        <div className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 pt-5 sm:pt-[26px] pb-10 sm:pb-[60px]">
            <PageHeader
                title={t("vndProposals.page.title")}
                description={t("vndProposals.page.description")}
                actions={
                    <button
                        type="button"
                        onClick={handleMarkAllRead}
                        disabled={counts.unread === 0 || markingAll}
                        className="flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[13px] font-semibold text-[#3a4560] transition-colors hover:bg-[#f6f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {markingAll ? <Loader2 size={15} className="animate-spin"/> : <CheckCheck size={15}/>}
                        {t("vndProposals.page.markAllRead")}
                    </button>
                }
            />

            {/* Вкладки статуса - как на странице "Реестр ВНД" (общий компонент Tabs) */}
            <Tabs<VndProposalStatusFilter> tabs={tabs} value={status} onChange={setStatus}/>

            {/* Поиск - во всю ширину */}
            <div className="mb-4">
                <SearchBar
                    variant="white"
                    placeholder={t("vndProposals.page.searchPlaceholder")}
                    value={searchInput}
                    onChange={setSearchInput}
                />
            </div>

            {loading ? (
                <Loader fullHeight={false}/>
            ) : error ? (
                <EmptyState variant="error" title={error}/>
            ) : items.length === 0 ? (
                <EmptyState icon={search ? undefined : Inbox} title={emptyTitle} description={emptyDescription}/>
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map((proposal) => (
                        <ProposalCard
                            key={proposal.id}
                            proposal={proposal}
                            expanded={expanded.has(proposal.id)}
                            highlighted={highlightId === proposal.id}
                            busy={busyId === proposal.id}
                            onToggle={() => toggleExpanded(proposal)}
                            onSetRead={(read) => void setReadState(proposal, read)}
                            cardRef={(el) => {
                                if (el) cardRefs.current.set(proposal.id, el);
                                else cardRefs.current.delete(proposal.id);
                            }}
                        />
                    ))}

                    <div className="mt-1 flex flex-col items-center gap-2">
                        <span className="text-[11.5px] text-[#a3adbd]">
                            {t("vndProposals.page.counter", {shown: items.length, total: totalCount})}
                        </span>
                        {items.length < totalCount && (
                            <button
                                type="button"
                                onClick={() => void load(page + 1)}
                                disabled={loadingMore}
                                className="flex h-[36px] cursor-pointer items-center gap-2 rounded-[10px] border border-[#e5e9f0] bg-white px-4 text-[12.5px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-60"
                            >
                                {loadingMore && <Loader2 size={14} className="animate-spin"/>}
                                {t("vndProposals.page.showMore")}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface ProposalCardProps {
    proposal: VndProposal;
    expanded: boolean;
    highlighted: boolean;
    busy: boolean;
    onToggle: () => void;
    onSetRead: (read: boolean) => void;
    cardRef: (el: HTMLDivElement | null) => void;
}

function ProposalCard({proposal, expanded, highlighted, busy, onToggle, onSetRead, cardRef}: ProposalCardProps) {
    const {t} = useTranslation();
    const [bg, fg] = AVATAR_COLORS[proposal.authorUserId % AVATAR_COLORS.length];
    const unread = !proposal.isRead;
    const authorMeta = [proposal.authorPosition, proposal.authorOrgUnit].filter(Boolean).join(" · ");

    return (
        <div
            ref={cardRef}
            className={`group relative overflow-hidden rounded-[14px] border bg-white transition-all duration-300 ${
                highlighted
                    ? "border-[#4e57d6] shadow-[0_0_0_4px_rgba(78,87,214,0.15)]"
                    : unread
                        ? "border-[#d9dcf7] shadow-[0_2px_10px_-4px_rgba(78,87,214,0.25)]"
                        : "border-[#e9edf3]"
            }`}
        >
            {unread && <span className="absolute inset-y-0 left-0 w-[4px] bg-[#4e57d6]"/>}

            {/* Заголовок карточки - кликабелен целиком (раскрыть/свернуть) */}
            <div
                role="button"
                tabIndex={0}
                onClick={onToggle}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggle();
                    }
                }}
                className={`cursor-pointer px-5 pb-3 pt-4 ${unread ? "bg-[#fafaff]" : ""}`}
            >
                <div className="flex items-start gap-3">
                    <span
                        className="grid h-10 w-10 flex-none place-items-center rounded-full text-[13px] font-bold"
                        style={{background: bg, color: fg}}
                    >
                        {initials(proposal.authorName)}
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className={`text-[13.5px] text-[#1c2740] ${unread ? "font-bold" : "font-semibold"}`}>
                                {proposal.authorName}
                            </span>
                            {unread && (
                                <span className="rounded-full bg-[#4e57d6] px-2 py-[1px] text-[10.5px] font-bold uppercase tracking-[0.03em] text-white">
                                    {t("vndProposals.page.unreadBadge")}
                                </span>
                            )}
                        </div>
                        {authorMeta && <div className="mt-[1px] truncate text-[11.5px] text-[#8b97ab]">{authorMeta}</div>}
                    </div>
                    <div className="flex flex-none flex-col items-end gap-0.5">
                        <span className="text-[12px] font-medium text-[#55617a]" title={formatDateTime(proposal.createdAt)}>
                            {formatRelativeTime(proposal.createdAt, t)}
                        </span>
                        <span className="text-[11px] text-[#a3adbd]">{formatDateTime(proposal.createdAt)}</span>
                    </div>
                </div>

                {/* ВНД */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
                    <Lightbulb size={14} className="flex-none text-[#c98a06]"/>
                    <span className="rounded-[6px] bg-[#ececfc] px-2 py-[1px] font-semibold text-[#4e57d6]">
                        {proposal.vndCode}
                    </span>
                    <span className="min-w-0 max-w-full truncate font-medium text-[#26324a]" title={proposal.vndTitle}>
                        {proposal.vndTitle}
                    </span>
                    {proposal.redactionCode && (
                        <span className="text-[#a3adbd]">· {t("vndProposals.page.redaction", {code: proposal.redactionCode})}</span>
                    )}
                </div>

                {/* Текст */}
                {proposal.text ? (
                    <p
                        className={`mt-2.5 whitespace-pre-wrap break-words text-[13px] leading-[1.6] text-[#26324a] ${
                            expanded ? "" : "line-clamp-3"
                        }`}
                    >
                        {proposal.text}
                    </p>
                ) : (
                    <p className="mt-2.5 text-[12.5px] italic text-[#a3adbd]">{t("vndProposals.page.noText")}</p>
                )}

                {/* Свёрнутое состояние - сводка по цитатам/файлам */}
                {!expanded && (proposal.quotes.length > 0 || proposal.attachments.length > 0) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {proposal.quotes.length > 0 && (
                            <span className="flex items-center gap-1 rounded-[7px] bg-[#f1f4f8] px-2 py-[3px] text-[11.5px] text-[#55617a]">
                                <Quote size={12}/> {proposal.quotes.length}
                            </span>
                        )}
                        {proposal.attachments.length > 0 && (
                            <span className="flex items-center gap-1 rounded-[7px] bg-[#f1f4f8] px-2 py-[3px] text-[11.5px] text-[#55617a]">
                                <Paperclip size={12}/> {proposal.attachments.length}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Раскрытое состояние */}
            {expanded && (
                <div className="space-y-4 px-5 pb-4">
                    {proposal.quotes.length > 0 && (
                        <div>
                            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                {t("vndProposals.page.quotesTitle")}
                            </div>
                            <div className="flex flex-col gap-2">
                                {proposal.quotes.map((q, i) => (
                                    <div key={i} className="rounded-[11px] border border-[#e5e9f0] bg-[#fbfcfe] p-3">
                                        <div className="flex items-start gap-2.5">
                                            <span className="mt-[2px] flex-none rounded-[5px] bg-[#eef0fb] px-1.5 py-[1px] text-[10.5px] font-bold text-[#4e57d6]">
                                                {i + 1} · {t(`vndProposals.langs.${q.documentTarget}`, {defaultValue: q.documentTarget.toUpperCase()})}
                                            </span>
                                            <blockquote className="min-w-0 flex-1 border-l-[3px] border-[#c7cbf2] pl-2.5 text-[12.5px] italic leading-[1.55] text-[#3a4560]">
                                                «{q.text}»
                                            </blockquote>
                                        </div>
                                        {q.note && (
                                            <p className="mt-2 whitespace-pre-wrap break-words pl-1 text-[12.5px] leading-[1.55] text-[#26324a]">
                                                {q.note}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {proposal.attachments.length > 0 && (
                        <div>
                            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.04em] text-[#a3adbd]">
                                {t("vndProposals.page.attachmentsTitle")}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {proposal.attachments.map((a) => (
                                    <button
                                        key={a.fileId}
                                        type="button"
                                        onClick={() => void downloadWithToast(a.fileId, a.fileName)}
                                        className="group/file flex max-w-full cursor-pointer items-center gap-2 rounded-[9px] border border-[#e5e9f0] bg-white py-[6px] pl-2.5 pr-3 text-left transition-colors hover:border-[#4e57d6]/40 hover:bg-[#f5f6fe]"
                                    >
                                        <FileText size={14} className="flex-none text-[#8b97ab]"/>
                                        <span className="max-w-[280px] truncate text-[12px] text-[#26324a]" title={a.fileName}>
                                            {a.fileName}
                                        </span>
                                        <span className="flex-none text-[11px] text-[#a3adbd]">{formatFileSize(a.sizeBytes)}</span>
                                        <Download size={13} className="flex-none text-[#a3adbd] group-hover/file:text-[#4e57d6]"/>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {proposal.isRead && proposal.readAt && (
                        <div className="text-[11.5px] text-[#a3adbd]">
                            {t("vndProposals.page.readBy", {
                                name: proposal.readByName ?? "—",
                                date: formatDateTime(proposal.readAt),
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Действия */}
            <div className="flex flex-wrap items-center gap-2 border-t border-[#f1f4f8] px-5 py-2.5">
                <button
                    type="button"
                    onClick={onToggle}
                    className="flex cursor-pointer items-center gap-1 rounded-[8px] px-2 py-1 text-[12px] font-semibold text-[#4e57d6] hover:bg-[#f5f6fe]"
                >
                    <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`}/>
                    {expanded ? t("vndProposals.page.collapse") : t("vndProposals.page.expand")}
                </button>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onSetRead(unread)}
                        className="flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#e5e9f0] bg-white px-2.5 py-[5px] text-[12px] font-semibold text-[#3a4560] hover:bg-[#f6f8fb] disabled:opacity-50"
                    >
                        {busy
                            ? <Loader2 size={13} className="animate-spin"/>
                            : unread ? <MailOpen size={13}/> : <Mail size={13}/>}
                        {unread ? t("vndProposals.page.markRead") : t("vndProposals.page.markUnread")}
                    </button>
                    <Link
                        to={`/base-vnd/${proposal.vndId}`}
                        className="flex items-center gap-1.5 rounded-[8px] bg-[#4e57d6] px-2.5 py-[5px] text-[12px] font-semibold !text-white no-underline hover:bg-[#3f47bd] hover:text-white hover:no-underline visited:text-white"
                    >
                        <ExternalLink size={13}/>
                        {t("vndProposals.page.openVnd")}
                    </Link>
                </div>
            </div>
        </div>
    );
}
