"use client";

import { normalizeCart, type CartItem } from "./web-cart";

const CART_KEY = "cartive:web-cart";
const CART_UPDATED_EVENT = "cartive:cart-updated";
const emptyCart: CartItem[] = [];
let cartSnapshot: CartItem[] | null = null;

function readStorageCart(): CartItem[] {
  try {
    const value = window.sessionStorage.getItem(CART_KEY);
    return value ? normalizeCart(JSON.parse(value)) : emptyCart;
  } catch {
    return emptyCart;
  }
}

export function subscribeToCart(callback: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.storageArea !== window.sessionStorage || (event.key !== CART_KEY && event.key !== null)) return;
    cartSnapshot = readStorageCart();
    callback();
  }

  window.addEventListener(CART_UPDATED_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getCartSnapshot() {
  if (cartSnapshot === null) cartSnapshot = readStorageCart();
  return cartSnapshot;
}

export function getServerCartSnapshot() {
  return emptyCart;
}

export function readCart(): CartItem[] {
  cartSnapshot = readStorageCart();
  return cartSnapshot;
}

export function writeCart(items: CartItem[]) {
  cartSnapshot = normalizeCart(items);
  window.sessionStorage.setItem(CART_KEY, JSON.stringify(cartSnapshot));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function clearCart() {
  cartSnapshot = emptyCart;
  window.sessionStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
