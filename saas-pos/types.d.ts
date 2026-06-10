// date-fns no resuelve sus tipos correctamente con moduleResolution "bundler"
declare module "date-fns" {
  export function format(date: Date | number, format: string, options?: { locale?: any }): string
  export function parseISO(dateString: string): Date
  export function isValid(date: any): boolean
  export function startOfDay(date: Date | number): Date
  export function endOfDay(date: Date | number): Date
  export function startOfMonth(date: Date | number): Date
  export function endOfMonth(date: Date | number): Date
  export function subDays(date: Date | number, amount: number): Date
  export function addDays(date: Date | number, amount: number): Date
  export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number
  export function isAfter(date: Date | number, dateToCompare: Date | number): boolean
  export function isBefore(date: Date | number, dateToCompare: Date | number): boolean
}

declare module "date-fns/locale" {
  export const es: any
}

declare module "lucide-react" {
  import React from "react"
  export interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string
  }
  export type Icon = React.FC<IconProps>
  export const AlertCircle: Icon
  export const ArrowLeft: Icon
  export const ArrowUpRight: Icon
  export const ArrowRight: Icon
  export const ArrowUpDown: Icon
  export const BarChart3: Icon
  export const Bell: Icon
  export const Calendar: Icon
  export const Check: Icon
  export const ChevronDown: Icon
  export const ChevronLeft: Icon
  export const ChevronRight: Icon
  export const ChevronUp: Icon
  export const Clock: Icon
  export const Copy: Icon
  export const DollarSign: Icon
  export const Download: Icon
  export const Edit: Icon
  export const Eye: Icon
  export const EyeOff: Icon
  export const FileText: Icon
  export const Filter: Icon
  export const History: Icon
  export const Home: Icon
  export const Image: Icon
  export const Info: Icon
  export const Loader2: Icon
  export const Lock: Icon
  export const LogOut: Icon
  export const Menu: Icon
  export const Minus: Icon
  export const Moon: Icon
  export const MoreHorizontal: Icon
  export const Package: Icon
  export const Plus: Icon
  export const Printer: Icon
  export const RefreshCw: Icon
  export const RotateCcw: Icon
  export const Save: Icon
  export const Search: Icon
  export const Settings: Icon
  export const ShoppingCart: Icon
  export const Sun: Icon
  export const Trash2: Icon
  export const TrendingDown: Icon
  export const TrendingUp: Icon
  export const Upload: Icon
  export const User: Icon
  export const Users: Icon
  export const X: Icon
  export const Zap: Icon
}
