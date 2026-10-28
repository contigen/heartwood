import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatZec(zatoshis: number, decimals = 4): string {
  return (zatoshis / 100_000_000).toFixed(decimals)
}

export function formatZatoshis(zatoshis: number): string {
  return zatoshis.toLocaleString("en-US")
}

export function middleTruncate(value: string, start = 20, end = 10): string {
  if (value.length <= start + end + 3) {
    return value
  }
  return `${value.slice(0, start)}...${value.slice(-end)}`
}

export function formatTimestamp(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatRelativeTime(unixSeconds: number): string {
  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds)
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`
  }
  return `${Math.floor(diffSeconds / 86400)}d ago`
}
