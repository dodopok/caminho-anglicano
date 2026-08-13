export type ExplorerValue = string | number | boolean | null | undefined

export interface ExplorerColumn {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right'
}

export interface ExplorerRow {
  id: string | number
  values: Record<string, ExplorerValue>
  searchable?: string
}

export interface ExplorerFilterOption {
  value: string
  label: string
}

export interface ExplorerFilter {
  key: string
  label: string
  options: ExplorerFilterOption[]
}
