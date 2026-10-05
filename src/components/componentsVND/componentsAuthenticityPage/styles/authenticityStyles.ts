import type {VndAuthenticitySignatureState} from "@/service/vndService/vndAuthenticityService.ts";
import type {ResolutionSignatureVerifyResponse} from "@/service/coordinationService/coordinationServiceTypes.ts";

export const CARD = "rounded-2xl border border-[#eef2f7] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)]";
export const CARD_TITLE = "text-[12px] font-bold uppercase tracking-[.04em] text-[#2d354a]";

export const BTN_PRIMARY =
    "inline-flex items-center gap-2 h-10 px-[15px] rounded-[10px] border-none bg-[#4e57d6] text-white " +
    "font-semibold text-[13px] cursor-pointer hover:brightness-[1.06] shadow-[0_6px_16px_-6px_#4e57d6] " +
    "disabled:cursor-not-allowed disabled:bg-[#e5e9f0] disabled:text-[#a3adbd] disabled:shadow-none";

export const BTN_SECONDARY =
    "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-[8px] border border-[#e5e9f0] bg-white " +
    "text-[#3a4560] font-semibold text-[12px] cursor-pointer hover:bg-[#f6f8fb] disabled:opacity-50 disabled:cursor-not-allowed";

export const STATE_STYLE: Record<VndAuthenticitySignatureState, string> = {
    signed_this_text: "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]",
    signed_other_text: "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]",
    auto_initiator: "border-[#e0e6ef] bg-[#f6f8fb] text-[#5c6779]",
    auto: "border-[#e0e6ef] bg-[#f6f8fb] text-[#5c6779]",
    no_signature: "border-[#f3dfb0] bg-[#fdf7e8] text-[#8a6100]",
    pending: "border-[#e0e6ef] bg-[#f6f8fb] text-[#8b97ab]",
};

/** Цвет точки на ленте истории - та же семантика, что у статусов подписи. */
export const STATE_DOT: Record<VndAuthenticitySignatureState, string> = {
    signed_this_text: "bg-[#1c9c5c]",
    signed_other_text: "bg-[#c0392b]",
    auto_initiator: "bg-[#c5cbe0]",
    auto: "bg-[#c5cbe0]",
    no_signature: "bg-[#e0a43a]",
    pending: "bg-[#dfe4ec]",
};

export const VERIFY_STYLE: Record<ResolutionSignatureVerifyResponse["status"], string> = {
    valid: "border-[#cfe3d6] bg-[#f2f9f5] text-[#1c7a4d]",
    document_changed: "border-[#f3dfb0] bg-[#fdf7e8] text-[#8a6100]",
    provider_unavailable: "border-[#e0e6ef] bg-[#f6f8fb] text-[#5c6779]",
    unsupported_schema: "border-[#e0e6ef] bg-[#f6f8fb] text-[#5c6779]",
    signature_invalid: "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]",
    journal_tampered: "border-[#f2c2c2] bg-[#fdf1f1] text-[#c0392b]",
};
