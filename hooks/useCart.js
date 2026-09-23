import { useQueryClient, useMutation, useQuery } from "react-query";

const readCartItems = () => {
  if (typeof window === "undefined") return [];

  try {
    const storedCart = window.localStorage.getItem("cart");
    if (!storedCart) return [];

    const parsedCart = JSON.parse(storedCart);
    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch (error) {
    console.warn("Sačuvana korpa nije ispravna i biće zanemarena.", error);
    return [];
  }
};

const writeCartItems = (items) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem("cart", JSON.stringify(items));
  } catch (error) {
    console.warn("Korpa nije mogla da se sačuva.", error);
  }
};

export function useCart() {
  const queryClient = useQueryClient();
  const initialCartItems = readCartItems();

  const addToCart = useMutation(
    async (product) => {
      const newCartItems = [...initialCartItems, product];
      writeCartItems(newCartItems);
      return product;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries("cart");
      },
    }
  );

  const removeFromCart = (index) => {
    const updatedCart = [...initialCartItems];
    updatedCart.splice(index, 1);
    writeCartItems(updatedCart);
    queryClient.invalidateQueries("cart"); // Invalidate the 'cart' query to refetch
  };

  const clearCart = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("cart");
      } catch (error) {
        console.warn("Korpa nije mogla da se obriše.", error);
      }
    }
    queryClient.invalidateQueries("cart"); // Invalidate the 'cart' query to refetch
  };

  const { data: cart, isLoading } = useQuery("cart", () => {
    return readCartItems();
  });
  return { addToCart, removeFromCart, clearCart, cart, isLoading };
}
