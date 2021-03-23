import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { stockAmount } = await getStock(productId);

      const itemAmount = cart.find(item => item.id === productId)?.amount;
      
      if (stockAmount < (itemAmount || 0) + 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;        
      } 

      if (!itemAmount) {
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        setCart(oldCart => {
          const newCart = [...oldCart, {...product, amount: 1}];
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

          return newCart;
        });
      } else {
        setCart(oldCart => {
          const newCart = oldCart.map(item => {
            if (item.id === productId) {
              return { ...item, amount: item.amount + 1 }
            }
            return item;
          })
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

          return newCart;
        });
      }

    } catch(error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    if (!cart.find(item => item.id === productId)) {
      toast.error('Erro na remoção do produto');
      return;
    }
    setCart(oldCart => {
      const newCart = oldCart.filter(item => item.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      return newCart;
    });      
  };

  const getStock = async (productId: number) => {
    const { data: stock } = await api.get<Stock>(`/stock/${productId}`);
    return { stockAmount: stock.amount };
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const { stockAmount } = await getStock(productId);      
      
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;        
      } 

      setCart(oldCart => {
        const newCart = oldCart.map(item => {
          if (item.id === productId) {
            return { ...item, amount }
          }
          return item;
        })
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        return newCart;
      });


    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
