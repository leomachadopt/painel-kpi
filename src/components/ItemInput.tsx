import { useState, useEffect, useRef } from 'react'
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { dailyEntriesApi } from '@/services/api'
import { OrderItem } from '@/lib/types'
import { toast } from 'sonner'

interface ItemInputProps {
  clinicId: string
  value: string
  onValueChange: (itemId: string) => void
  itemName?: string
  onItemNameChange?: (name: string) => void
  label?: string
  required?: boolean
  error?: string
}

export function ItemInput({
  clinicId,
  value,
  onValueChange,
  itemName = '',
  onItemNameChange,
  label = 'Item',
  required = true,
  error,
}: ItemInputProps) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [creating, setCreating] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Load items when component mounts or search term changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadItems(searchTerm)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, clinicId])

  // Load item by ID when value changes
  useEffect(() => {
    if (value && !itemName) {
      loadItemById(value)
    }
  }, [value])

  const loadItems = async (search: string = '') => {
    if (!clinicId) return

    setLoading(true)
    try {
      const data = await dailyEntriesApi.orderItem.getAll(clinicId, search)
      setItems(data)
    } catch (err: any) {
      console.error('Error loading items:', err)
      toast.error('Erro ao carregar itens')
    } finally {
      setLoading(false)
    }
  }

  const loadItemById = async (itemId: string) => {
    if (!clinicId || !itemId) return

    try {
      const item = await dailyEntriesApi.orderItem.getById(clinicId, itemId)
      if (onItemNameChange) {
        onItemNameChange(item.name)
      }
    } catch (err: any) {
      console.error('Error loading item:', err)
    }
  }

  const handleCreateItem = async () => {
    if (!searchTerm.trim() || !clinicId) return

    setCreating(true)
    try {
      const newItem = await dailyEntriesApi.orderItem.create(clinicId, {
        name: searchTerm.trim(),
        unit: 'unidade',
      })
      
      setItems([...items, newItem])
      onValueChange(newItem.id)
      if (onItemNameChange) {
        onItemNameChange(newItem.name)
      }
      setSearchTerm('')
      setOpen(false)
      toast.success('Item criado com sucesso!')
    } catch (err: any) {
      console.error('Error creating item:', err)
      toast.error(err.message || 'Erro ao criar item')
    } finally {
      setCreating(false)
    }
  }

  const selectedItem = items.find((i) => i.id === value)

  return (
    <div className="space-y-2">
      <Label htmlFor="item-input">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            id="item-input"
          >
            {selectedItem ? (
              <span className="truncate">
                {selectedItem.name}
                {selectedItem.unit && (
                  <span className="text-muted-foreground ml-2">({selectedItem.unit})</span>
                )}
              </span>
            ) : itemName ? (
              <span className="truncate text-muted-foreground">{itemName}</span>
            ) : (
              <span className="text-muted-foreground">Selecione ou crie um item...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar item..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {searchTerm.trim() ? (
                      <div className="flex flex-col gap-2 p-2">
                        <p className="text-sm text-muted-foreground">
                          Nenhum item encontrado
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateItem}
                          disabled={creating}
                          className="w-full"
                        >
                          {creating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Criar "{searchTerm.trim()}"
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Digite para buscar ou criar um item
                      </p>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        onSelect={() => {
                          onValueChange(item.id)
                          if (onItemNameChange) {
                            onItemNameChange(item.name)
                          }
                          setOpen(false)
                          setSearchTerm('')
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === item.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="truncate">{item.name}</span>
                          {item.unit && (
                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}
    </div>
  )
}







