/**
 * Client-side Filtering & Search Service
 * Filter data locally without network requests
 * 
 * Benefits:
 * - 0 network requests for filters
 * - Instant search results
 * - 100% savings on filter queries
 */

import React from 'react'

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'gt' | 'lt' | 'between'

export interface FilterCondition {
  field: string
  operator: FilterOperator
  value: any
  value2?: any // For 'between' operator
}

export interface SearchOptions {
  query: string
  fields: string[] // Fields to search in
  caseSensitive?: boolean
}

class ClientSideFilter {
  /**
   * Filter array of objects
   */
  filter<T extends Record<string, any>>(data: T[], conditions: FilterCondition[]): T[] {
    if (!conditions || conditions.length === 0) {
      return data
    }

    return data.filter(item => {
      return conditions.every(condition => this.evaluateCondition(item, condition))
    })
  }

  /**
   * Search across multiple fields
   */
  search<T extends Record<string, any>>(data: T[], options: SearchOptions): T[] {
    const { query, fields, caseSensitive = false } = options

    if (!query || !fields || fields.length === 0) {
      return data
    }

    const searchTerm = caseSensitive ? query : query.toLowerCase()

    return data.filter(item => {
      return fields.some(field => {
        const value = this.getNestedField(item, field)
        if (value === null || value === undefined) return false

        const stringValue = caseSensitive ? String(value) : String(value).toLowerCase()
        return stringValue.includes(searchTerm)
      })
    })
  }

  /**
   * Sort array
   */
  sort<T extends Record<string, any>>(
    data: T[],
    sortBy: string,
    order: 'asc' | 'desc' = 'asc'
  ): T[] {
    const sorted = [...data].sort((a, b) => {
      const valueA = this.getNestedField(a, sortBy)
      const valueB = this.getNestedField(b, sortBy)

      if (valueA === null || valueA === undefined) return 1
      if (valueB === null || valueB === undefined) return -1

      if (typeof valueA === 'string') {
        return order === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
      }

      return order === 'asc' ? (valueA as any) - (valueB as any) : (valueB as any) - (valueA as any)
    })

    return sorted
  }

  /**
   * Combine filter, search, and sort
   */
  process<T extends Record<string, any>>(
    data: T[],
    options: {
      filters?: FilterCondition[]
      search?: SearchOptions
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }
  ): T[] {
    let result = data

    if (options.filters) {
      result = this.filter(result, options.filters)
    }

    if (options.search) {
      result = this.search(result, options.search)
    }

    if (options.sortBy) {
      result = this.sort(result, options.sortBy, options.sortOrder || 'asc')
    }

    return result
  }

  /**
   * Get unique values for a field (for dropdowns)
   */
  getUniqueValues<T extends Record<string, any>>(data: T[], field: string): any[] {
    const values = new Set<any>()

    data.forEach(item => {
      const value = this.getNestedField(item, field)
      if (value !== null && value !== undefined) {
        values.add(value)
      }
    })

    return Array.from(values)
  }

  /**
   * Group data by field
   */
  groupBy<T extends Record<string, any>>(data: T[], field: string): Map<any, T[]> {
    const grouped = new Map<any, T[]>()

    data.forEach(item => {
      const value = this.getNestedField(item, field)
      if (!grouped.has(value)) {
        grouped.set(value, [])
      }
      grouped.get(value)!.push(item)
    })

    return grouped
  }

  // ===== PRIVATE =====

  private evaluateCondition(item: Record<string, any>, condition: FilterCondition): boolean {
    const value = this.getNestedField(item, condition.field)

    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'contains':
        return String(value).includes(String(condition.value))
      case 'startsWith':
        return String(value).startsWith(String(condition.value))
      case 'gt':
        return value > condition.value
      case 'lt':
        return value < condition.value
      case 'between':
        return value >= condition.value && value <= condition.value2
      default:
        return false
    }
  }

  private getNestedField(obj: Record<string, any>, path: string): any {
    const keys = path.split('.')
    let value = obj

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key]
      } else {
        return undefined
      }
    }

    return value
  }
}

export const clientSideFilter = new ClientSideFilter()

/**
 * React Hook for client-side filtering
 */
export function useClientSideFilter<T extends Record<string, any>>(data: T[]) {
  const [filters, setFilters] = React.useState<FilterCondition[]>([])
  const [search, setSearch] = React.useState<SearchOptions | undefined>()
  const [sortBy, setSortBy] = React.useState<string | undefined>()
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc')

  const filteredData = React.useMemo(() => {
    return clientSideFilter.process(data, {
      filters: filters.length > 0 ? filters : undefined,
      search,
      sortBy,
      sortOrder,
    })
  }, [data, filters, search, sortBy, sortOrder])

  return {
    data: filteredData,
    filters,
    setFilters,
    addFilter: (condition: FilterCondition) => setFilters(prev => [...prev, condition]),
    removeFilter: (index: number) => setFilters(prev => prev.filter((_, i) => i !== index)),
    clearFilters: () => setFilters([]),
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  }
}
