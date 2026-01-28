/**
 * Virtual Scrolling Component
 * Only render visible items for smooth 60fps scrolling
 * 
 * Benefits:
 * - Smooth scrolling with 100+ items
 * - Low memory usage
 * - Better performance
 */

'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'

interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number // Items to render outside viewport
  className?: string
  containerHeight?: number
}

export function VirtualScroll<T>({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  containerHeight = 600,
}: VirtualScrollProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = React.useState(0)

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)

    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Only render visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex).map((item, i) => ({
      item,
      index: visibleRange.startIndex + i,
    }))
  }, [items, visibleRange])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop)
  }, [])

  const totalHeight = items.length * itemHeight

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer for scrolled-past items */}
      <div style={{ height: visibleRange.startIndex * itemHeight }} />

      {/* Render visible items */}
      {visibleItems.map(({ item, index }) => (
        <div key={index} style={{ height: itemHeight, overflow: 'hidden' }}>
          {renderItem(item, index)}
        </div>
      ))}

      {/* Spacer for below-viewport items */}
      <div style={{ height: Math.max(0, (items.length - visibleRange.endIndex) * itemHeight) }} />
    </div>
  )
}

/**
 * Hook version of Virtual Scroll
 */
export function useVirtualScroll(items: any[], itemHeight: number, containerHeight: number = 600) {
  const [scrollTop, setScrollTop] = React.useState(0)
  const overscan = 3

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)

    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex)
  }, [items, visibleRange])

  return {
    visibleItems,
    visibleRange,
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop((e.target as HTMLDivElement).scrollTop)
    },
    scrollTop,
    totalHeight: items.length * itemHeight,
    offsetTop: visibleRange.startIndex * itemHeight,
  }
}

/**
 * Grid Virtual Scroll (for table-like layouts)
 */
interface GridVirtualScrollProps<T> {
  items: T[]
  rowHeight: number
  columnWidths: number[]
  renderCell: (item: T, columnIndex: number, rowIndex: number) => React.ReactNode
  headers?: React.ReactNode[]
  containerHeight?: number
  className?: string
}

export function GridVirtualScroll<T>({
  items,
  rowHeight,
  columnWidths,
  renderCell,
  headers,
  containerHeight = 600,
  className = '',
}: GridVirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const overscan = 5

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const endIndex = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan)

    return { startIndex, endIndex }
  }, [scrollTop, rowHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex).map((item, i) => ({
      item,
      index: visibleRange.startIndex + i,
    }))
  }, [items, visibleRange])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop)
  }, [])

  const totalHeight = items.length * rowHeight
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0)

  return (
    <div
      ref={containerRef}
      className={`overflow-auto border border-gray-200 rounded-lg ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Fixed Header */}
      {headers && (
        <div
          className="sticky top-0 bg-gray-50 border-b border-gray-200 flex z-10"
          style={{
            width: totalWidth,
          }}
        >
          {headers.map((header, i) => (
            <div
              key={i}
              className="px-4 py-2 font-semibold text-sm text-gray-700 border-r border-gray-200 last:border-r-0 flex items-center"
              style={{ width: columnWidths[i] }}
            >
              {header}
            </div>
          ))}
        </div>
      )}

      {/* Spacer for scrolled-past rows */}
      <div style={{ height: visibleRange.startIndex * rowHeight }} />

      {/* Render visible rows */}
      {visibleItems.map(({ item, index }) => (
        <div
          key={index}
          className="flex border-b border-gray-200 hover:bg-gray-50"
          style={{
            height: rowHeight,
            width: totalWidth,
          }}
        >
          {columnWidths.map((width, colIndex) => (
            <div
              key={colIndex}
              className="px-4 py-2 border-r border-gray-200 last:border-r-0 flex items-center text-sm overflow-hidden"
              style={{
                width,
              }}
            >
              {renderCell(item, colIndex, index)}
            </div>
          ))}
        </div>
      ))}

      {/* Spacer for below-viewport rows */}
      <div style={{ height: Math.max(0, (items.length - visibleRange.endIndex) * rowHeight) }} />
    </div>
  )
}
