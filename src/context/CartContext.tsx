"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";

export interface CartItem {
  variantId: number;
  productId: number;
  name: string;
  price: number;
  currency: string;
  imageUrl: string;
  quantity: number;
  size?: string;
  color?: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD"; item: CartItem }
  | { type: "REMOVE"; variantId: number }
  | { type: "UPDATE_QTY"; variantId: number; quantity: number }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD": {
      const existing = state.items.find(
        (i) => i.variantId === action.item.variantId
      );
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === action.item.variantId
              ? { ...i, quantity: i.quantity + action.item.quantity }
              : i
          ),
        };
      }
      return { items: [...state.items, action.item] };
    }
    case "REMOVE":
      return {
        items: state.items.filter((i) => i.variantId !== action.variantId),
      };
    case "UPDATE_QTY":
      return {
        items: state.items.map((i) =>
          i.variantId === action.variantId
            ? { ...i, quantity: action.quantity }
            : i
        ),
      };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: CartItem) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = useCallback((item: CartItem) => {
    dispatch({ type: "ADD", item });
  }, []);

  const removeItem = useCallback((variantId: number) => {
    dispatch({ type: "REMOVE", variantId });
  }, []);

  const updateQuantity = useCallback((variantId: number, quantity: number) => {
    if (quantity < 1) {
      dispatch({ type: "REMOVE", variantId });
    } else {
      dispatch({ type: "UPDATE_QTY", variantId, quantity });
    }
  }, []);

  const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = state.items.reduce(
    (s, i) => s + i.price * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
