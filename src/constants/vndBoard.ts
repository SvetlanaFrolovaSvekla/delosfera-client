// Панели "Доски ВНД" (см. VndBoardPage). Документы раскладываются по статусу последней редакции
// (STATUS_META), плюс отдельная панель "Избранное" — личные звёздочки пользователя.
// title/hint/empty — ключи i18n (namespace vndBoard.panels), переводятся на месте использования.
import {Star, type LucideIcon} from "lucide-react";
import type {VndStatusKey} from "@/constants/vndTabs.ts";
import {STATUS_META} from "@/constants/vndStatus.ts";
import type {VndResponse} from "@/service/vndService/vndServiceType.ts";
import type {VndBoardReason} from "@/service/vndService/vndBoardService.ts";

export type VndBoardPanelKey = VndStatusKey | "favorites";

export interface VndBoardPanelMeta {
    key: VndBoardPanelKey;
    title: string;
    hint: string;
    empty: string;
    color: string;
    bg: string;
    icon: LucideIcon;
}

const statusPanel = (key: VndStatusKey): VndBoardPanelMeta => ({
    key,
    title: `vndBoard.panels.${key}.title`,
    hint: `vndBoard.panels.${key}.hint`,
    empty: `vndBoard.panels.${key}.empty`,
    color: STATUS_META[key].color,
    bg: STATUS_META[key].bg,
    icon: STATUS_META[key].icon as LucideIcon,
});

const FAVORITES_PANEL: VndBoardPanelMeta = {
    key: "favorites",
    title: "vndBoard.panels.favorites.title",
    hint: "vndBoard.panels.favorites.hint",
    empty: "vndBoard.panels.favorites.empty",
    color: "#b07800",
    bg: "#fff4d6",
    icon: Star,
};

// Порядок — по жизненному циклу документа: что действует сейчас → что в работе → что в прошлом.
const EXTENDED_STATUS_ORDER: VndStatusKey[] = ["active", "onact", "review", "consol", "arch", "draft"];

// Без права ViewVndRegistryExtended стадии жизненного цикла (на актуализации / согласовании /
// консолидации) пользователю не показываются (см. collapseDocumentStatus в vndStatus.ts) — такие
// документы просто "действующие", и отдельных панелей под стадии нет.
const SIMPLE_STATUS_ORDER: VndStatusKey[] = ["active", "arch", "draft"];

export function getVndBoardPanels(canViewExtended: boolean): VndBoardPanelMeta[] {
    const order = canViewExtended ? EXTENDED_STATUS_ORDER : SIMPLE_STATUS_ORDER;
    const panels = order.map(statusPanel);
    if (!canViewExtended) {
        panels[0] = {
            ...panels[0],
            title: "vndBoard.panels.activeSimple.title",
            hint: "vndBoard.panels.activeSimple.hint",
        };
    }
    return [...panels, FAVORITES_PANEL];
}

/** В какую статусную панель попадает документ */
export function vndBoardPanelOf(vnd: VndResponse, canViewExtended: boolean): VndStatusKey {
    if (canViewExtended) return vnd.status;
    if (vnd.status === "arch" || vnd.status === "draft") return vnd.status;
    return "active";
}

// Причины попадания на доску: цвет "чипа" на карточке и в легенде.
// label/tooltip — ключи i18n (namespace vndBoard.reasons).
export const VND_BOARD_REASON_META: Record<VndBoardReason, {
    label: string; tooltip: string; color: string; bg: string;
}> = {
    developer: {
        label: "vndBoard.reasons.developer.label",
        tooltip: "vndBoard.reasons.developer.tooltip",
        color: "#4e57d6",
        bg: "#ececfc",
    },
    executor: {
        label: "vndBoard.reasons.executor.label",
        tooltip: "vndBoard.reasons.executor.tooltip",
        color: "#0f7a72",
        bg: "#def5f2",
    },
    pinned: {
        label: "vndBoard.reasons.pinned.label",
        tooltip: "vndBoard.reasons.pinned.tooltip",
        color: "#a35a00",
        bg: "#fdf0dc",
    },
};

export const VND_BOARD_REASON_ORDER: VndBoardReason[] = ["developer", "executor", "pinned"];

/** Фильтр "откуда документ на доске" */
export type VndBoardSourceFilter = "all" | "unit" | "pinned";
