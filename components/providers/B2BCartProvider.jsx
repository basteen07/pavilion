'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { apiCall } from '@/lib/api-client'
// apiCall helper was defined inside files previously, I should probably check @/lib/api-client existence
// Step 17 showed import { apiCall } from '@/lib/api-client' in ProductDetailPage.

const B2BCartContext = createContext({
    cart: [],
    addToCart: () => { },
    removeFromCart: () => { },
    clearCart: () => { },
    placeOrder: async () => { },
    cartTotal: 0
})

export function B2BCartProvider({ children }) {
    const [cart, setCart] = useState([])

    useEffect(() => {
        // Load from local storage
        const stored = localStorage.getItem('b2b_cart')
        if (stored) {
            try {
                setCart(JSON.parse(stored))
            } catch (e) {
                console.error('Failed to parse cart', e)
            }
        }
    }, [])

    useEffect(() => {
        localStorage.setItem('b2b_cart', JSON.stringify(cart))
    }, [cart])

    const addToCart = (product, quantity = 1) => {
        if (!product || !product.id) {
            console.error('Invalid product passed to addToCart')
            return
        }

        console.log('Adding to cart:', product.name, quantity)

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                )
            }
            // Ensure we store price info
            return [...prev, { ...product, quantity }]
        })
        toast.success(`Added ${product.name} to Order List`)
    }

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId))
    }

    const clearCart = () => setCart([])

    const cartTotal = cart.reduce((sum, item) => {
        const price = parseFloat(item.dealer_price || item.selling_price || item.mrp_price || 0)
        return sum + (isNaN(price) ? 0 : price) * item.quantity
    }, 0)

    const placeOrder = async (notes) => {
        if (cart.length === 0) return

        const orderData = {
            products: cart.map(item => ({
                product_id: item.id,
                name: item.name,
                price: parseFloat(item.dealer_price || item.selling_price || item.mrp_price || 0),
                quantity: item.quantity
            })),
            notes: notes || 'Order from Wholesale Portal'
        }

        console.log('Placing order:', orderData)

        await apiCall('/b2b/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        })
        clearCart()
    }

    return (
        <B2BCartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            clearCart,
            placeOrder,
            cartTotal
        }}>
            {children}
        </B2BCartContext.Provider>
    )
}

export const useB2BCart = () => useContext(B2BCartContext)
