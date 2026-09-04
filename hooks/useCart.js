import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useMutation, useQuery } from "react-query";

export function useCart() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const storageKey = user ? `marbok-cart-${user.uid}` : null;
  const cartQueryKey = ["cart", user?.uid || "anonymous"];

  // Check if localStorage is available
  const isLocalStorageAvailable =
    !!storageKey && typeof window !== "undefined" && window.localStorage;

  const addToCart = useMutation(
    async (product) => {
      const currentCartItems = isLocalStorageAvailable
        ? JSON.parse(localStorage.getItem(storageKey)) || []
        : [];
      const existingProductIndex = currentCartItems.findIndex(
        (item) =>
          (product.productId && item.productId === product.productId) ||
          (product.productKey && item.productKey === product.productKey)
      );
      const newCartItems = [...currentCartItems];

      if (existingProductIndex >= 0) {
        const currentQuantity =
          parseInt(newCartItems[existingProductIndex].quantity, 10) || 0;
        const addedQuantity = parseInt(product.quantity, 10) || 0;
        newCartItems[existingProductIndex] = {
          ...newCartItems[existingProductIndex],
          ...product,
          quantity: String(currentQuantity + addedQuantity),
        };
      } else {
        newCartItems.push(product);
      }

      if (isLocalStorageAvailable) {
        localStorage.setItem(storageKey, JSON.stringify(newCartItems));
      }
      return product;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(cartQueryKey);
      },
    }
  );

  const removeFromCart = (index) => {
    const updatedCart = isLocalStorageAvailable
      ? JSON.parse(localStorage.getItem(storageKey)) || []
      : [];
    updatedCart.splice(index, 1);
    if (isLocalStorageAvailable) {
      localStorage.setItem(storageKey, JSON.stringify(updatedCart));
    }
    queryClient.invalidateQueries(cartQueryKey); // Invalidate the 'cart' query to refetch
  };

  const updateCartQuantity = (index, quantity) => {
    const parsedQuantity = Math.max(parseInt(quantity, 10) || 1, 1);
    const updatedCart = isLocalStorageAvailable
      ? JSON.parse(localStorage.getItem(storageKey)) || []
      : [];

    if (!updatedCart[index]) return;

    updatedCart[index] = {
      ...updatedCart[index],
      quantity: String(parsedQuantity),
    };
    localStorage.setItem(storageKey, JSON.stringify(updatedCart));
    queryClient.invalidateQueries(cartQueryKey);
  };

  const clearCart = () => {
    if (isLocalStorageAvailable) {
      localStorage.removeItem(storageKey);
    }
    queryClient.invalidateQueries(cartQueryKey); // Invalidate the 'cart' query to refetch
  };

  const { data: cart, isLoading } = useQuery(cartQueryKey, () => {
    // Retrieve cart items from local storage
    if (isLocalStorageAvailable) {
      const storedCartItems = JSON.parse(localStorage.getItem(storageKey)) || [];
      return storedCartItems;
    }
    return [];
  });
  return {
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cart,
    isLoading,
  };
}
