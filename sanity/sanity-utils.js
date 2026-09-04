import { auth } from "@/config/firebase";
async function request(path, options = {}) {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(path, { ...options, cache: "no-store", headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers,
    } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Podaci trenutno nisu dostupni.");
    return result;
}
const content = (kind) => request(`/api/content?kind=${kind}`).then(result => result.data);
export const getPages = () => content("pages");
export const getCategories = () => content("categories");
export const getImages = () => content("images");
export const getHeading = () => content("heading");
export const getBrandImages = () => content("brands");
export const getAboutUs = () => content("about");
export const getStores = () => content("stores");
export const createOrder = (data) => request("/api/orders/create", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
}).then(result => result.order);
export const uploadOrderExcel = (file, orderNumber) => request(`/api/orders/excel?orderNumber=${encodeURIComponent(orderNumber)}`, {
    method: "POST", headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, body: file,
}).then(result => result.url);
