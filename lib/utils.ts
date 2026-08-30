import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// standard shadcn/ui utility — combines clsx + tailwind-merge
// so class names don't conflict
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
