import { requireApproved, AccessError } from "@/server/accountAccess";
import { sanityClient } from "@/server/sanityClient";
export async function readAccessibleOrder(req, orderNumber) {
    const session = await requireApproved(req);
    if (typeof orderNumber !== "string" || !/^ORD-[a-zA-Z0-9-]{1,100}$/.test(orderNumber)) throw new AccessError(400, "Neispravna porudžbina.");
    // Old orders lacking a customer UID can be opened only by the owner.
    const order = await sanityClient().fetch(`*[_type == "order" && orderNumber == $orderNumber && ($owner || customerUid == $uid)][0]{
        ..., items[]{..., "productDetails": *[_type == "productInfo" && ((_id == ^.productId) || (!defined(^.productId) && productKey == ^.productKey))][0]{name,image,productKey,package}}
    }`, { orderNumber, owner: session.owner, uid: session.account.localId });
    if (!order) throw new AccessError(404, "Porudžbina nije pronađena ili nemaš pristup.");
    return order;
}
