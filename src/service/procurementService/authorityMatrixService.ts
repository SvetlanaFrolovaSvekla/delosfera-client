import {apiClient} from "@/service/apiClient.ts";

/**
 * Орган, утверждающий расход по итогам закупки.
 * Сервер сериализует перечисления строками, а не числами.
 */
export type ApprovalAuthority = "None" | "Curator" | "Board" | "SupervisoryBoard" | "Shareholders";

/** Строка-факт под карточкой результата: порог, по которому сработало правило. */
export interface MatrixFact {
    key: string;
    value: string;
    isHighlighted: boolean;
}

/** Результат подбора по Матрице полномочий (PRC-04). */
export interface MatrixResolveResult {
    methodCode: string;
    methodTitle: string;
    methodShortTitle: string;
    alternativeMethodTitle: string | null;

    approvalChain: string;
    commissionRequired: boolean;
    commissionSize: number | null;
    commissionMinBoardMembers: number | null;
    commissionNote: string;

    approvalAuthority: ApprovalAuthority;
    approvalAuthorityTitle: string;

    protocolRequired: boolean;
    protocolThreshold: number;

    minProposals: number;
    requiresJustification: boolean;
    requiresPublication: boolean;

    facts: MatrixFact[];
    notes: string[];
    ruleId: number | null;
}

/** Строка приложения №1 с порогами, пересчитанными в сомы. */
export interface MatrixRule {
    id: number;
    methodTitle: string;
    methodShortTitle: string;
    isAffiliated: boolean;
    rangeTitle: string;
    minAmount: number | null;
    maxAmount: number | null;
    approvalChain: string;
    commissionNote: string;
    approvalAuthorityTitle: string;
    sortOrder: number;
}

/** Матрица целиком плюс параметры, от которых считаются пороги. */
export interface MatrixTable {
    regular: MatrixRule[];
    affiliated: MatrixRule[];
    balanceAssets: number;
    nsk: number;
    protocolThreshold: number;
}

export interface MatrixResolveRequest {
    amount: number;
    isAffiliated: boolean;
    /** Direct | Simple | TenderOpen | TenderLimited; пусто — способ подбирает матрица. */
    preferredMethod?: string;
}

const BASE = "/procurement";

export const authorityMatrixService = {
    async table(): Promise<MatrixTable> {
        const {data} = await apiClient.get<MatrixTable>(`${BASE}/matrix`);
        return data;
    },

    async resolve(request: MatrixResolveRequest): Promise<MatrixResolveResult> {
        const {data} = await apiClient.post<MatrixResolveResult>(`${BASE}/matrix/resolve`, request);
        return data;
    },
};
