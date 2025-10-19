import { createContext, useContext, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const addItem = (item) => {
  const normalizedItem = { ...item, price: Number(item.price) || 0, options: item.options || {} }; // força tipo numérico
  // Considera opções como parte da identidade do item no carrinho
  const exists = items.find(
    (i) => i.id === normalizedItem.id && JSON.stringify(i.options || {}) === JSON.stringify(normalizedItem.options || {})
  );

  if (exists) {
    setItems(
      items.map((i) =>
        i.id === normalizedItem.id && JSON.stringify(i.options || {}) === JSON.stringify(normalizedItem.options || {})
          ? { ...i, qty: i.qty + 1 }
          : i
      )
    );
  } else {
    setItems([...items, { ...normalizedItem, qty: 1 }]);
  }
};


  const removeItem = (id) => setItems(items.filter((i) => i.id !== id));
  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = items.length > 0 ? 7.9 : 0;
  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, clearCart, subtotal, total, deliveryFee }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
