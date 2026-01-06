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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { dailyEntriesApi } from '@/services/api'
import { Supplier } from '@/lib/types'
import { toast } from 'sonner'

interface SupplierInputProps {
  clinicId: string
  value: string
  onValueChange: (supplierId: string) => void
  supplierName?: string
  onSupplierNameChange?: (name: string) => void
  label?: string
  required?: boolean
  error?: string
}

export function SupplierInput({
  clinicId,
  value,
  onValueChange,
  supplierName = '',
  onSupplierNameChange,
  label = 'Fornecedor',
  required = true,
  error,
}: SupplierInputProps) {
  const [open, setOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [creating, setCreating] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Load suppliers when component mounts or search term changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadSuppliers(searchTerm)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, clinicId])

  // Load supplier by ID when value changes
  useEffect(() => {
    if (value && !supplierName) {
      loadSupplierById(value)
    }
  }, [value])

  const loadSuppliers = async (search: string = '') => {
    if (!clinicId) return

    setLoading(true)
    try {
      const data = await dailyEntriesApi.supplier.getAll(clinicId, search)
      setSuppliers(data)
    } catch (err: any) {
      console.error('Error loading suppliers:', err)
      toast.error('Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  const loadSupplierById = async (supplierId: string) => {
    if (!clinicId || !supplierId) return

    try {
      const supplier = await dailyEntriesApi.supplier.getById(clinicId, supplierId)
      if (onSupplierNameChange) {
        onSupplierNameChange(supplier.name)
      }
    } catch (err: any) {
      console.error('Error loading supplier:', err)
    }
  }

  const handleCreateSupplier = async () => {
    if (!searchTerm.trim() || !clinicId) return

    setCreating(true)
    try {
      const newSupplier = await dailyEntriesApi.supplier.create(clinicId, {
        name: searchTerm.trim(),
      })
      
      setSuppliers([...suppliers, newSupplier])
      onValueChange(newSupplier.id)
      if (onSupplierNameChange) {
        onSupplierNameChange(newSupplier.name)
      }
      setSearchTerm('')
      setOpen(false)
      toast.success('Fornecedor criado com sucesso!')
    } catch (err: any) {
      console.error('Error creating supplier:', err)
      toast.error(err.message || 'Erro ao criar fornecedor')
    } finally {
      setCreating(false)
    }
  }

  const selectedSupplier = suppliers.find((s) => s.id === value)

  return (
    <div className="space-y-2">
      <Label htmlFor="supplier-input">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            id="supplier-input"
          >
            {selectedSupplier ? (
              <span className="truncate">{selectedSupplier.name}</span>
            ) : supplierName ? (
              <span className="truncate text-muted-foreground">{supplierName}</span>
            ) : (
              <span className="text-muted-foreground">Selecione ou crie um fornecedor...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar fornecedor..."
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
                          Nenhum fornecedor encontrado
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateSupplier}
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
                        Digite para buscar ou criar um fornecedor
                      </p>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {suppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        value={supplier.id}
                        onSelect={() => {
                          onValueChange(supplier.id)
                          if (onSupplierNameChange) {
                            onSupplierNameChange(supplier.name)
                          }
                          setOpen(false)
                          setSearchTerm('')
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === supplier.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="truncate">{supplier.name}</span>
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

