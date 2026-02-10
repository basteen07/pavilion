import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(img) {
  if (!img) return '';
  if (typeof img === 'object') return img.url || '';
  return img;
}
