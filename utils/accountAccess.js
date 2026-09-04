// Firebase Auth creation time is trusted; dates in editable profiles are not.
export const APPROVAL_REQUIRED_FROM = Date.parse("2026-09-04T14:55:23Z");
export function accountStatus(account, profile) {
    if (profile?.approvalStatus === "rejected") return "rejected";
    if (profile?.approvalStatus === "approved") return "approved";
    const created = Number(account?.createdAt);
    if (Number.isFinite(created) && created > 0 && created < APPROVAL_REQUIRED_FROM) return "approved";
    return "pending";
}
export function withoutPrices(value) {
    if (Array.isArray(value)) return value.map(withoutPrices);
    if (value && typeof value === "object") return Object.fromEntries(
        Object.entries(value).filter(([key]) => !["price", "totalPrice"].includes(key))
            .map(([key, item]) => [key, withoutPrices(item)])
    );
    return value;
}
