declare module 'date-fns' {
  export function format(date: Date | string | number, format: string, options?: { locale?: any }): string
}

declare module 'date-fns/locale' {
  export const es: any
}

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  type Icon = FC<SVGProps<SVGSVGElement> & { size?: number | string }>
  const ArrowUpRight: Icon
  const Check: Icon
  const ChevronDown: Icon
  const ChevronUp: Icon
  const X: Icon
  const Loader2: Icon
  export { ArrowUpRight, Check, ChevronDown, ChevronUp, X, Loader2 }
}
