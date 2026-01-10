import { useState, useEffect, useRef } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
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
import { toast } from 'sonner'

interface CategoryInputProps {
  clinicId: string
  value: string
  onValueChange: (category: string) => void
  label?: string
  required?: boolean
  error?: string
}

export function CategoryInput({
  clinicId,
  value,
  onValueChange,
  label = 'Categoria',
  required = false,
  error,
}: CategoryInputProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Load categories when component mounts or search term changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadCategories(searchTerm)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchTerm, clinicId])

  const loadCategories = async (search: string = '') => {
    if (!clinicId) return

    setLoading(true)
    try {
      const data = await dailyEntriesApi.accountsPayable.getCategories(clinicId, search)
      setCategories(data)
    } catch (err: any) {
      console.error('Error loading categories:', err)
      toast.error('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCategory = (category: string) => {
    onValueChange(category)
    setOpen(false)
    setSearchTerm('')
  }

  const handleCreateNew = () => {
    if (searchTerm.trim()) {
      handleSelectCategory(searchTerm.trim())
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="category-input">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            id="category-input"
          >
            {value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-muted-foreground">Selecione ou digite uma categoria...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar categoria..."
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
                          Nenhuma categoria encontrada
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateNew}
                          className="w-full"
                        >
                          Usar "{searchTerm.trim()}"
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Digite para buscar ou criar uma categoria
                      </p>
                    )}
                  </CommandEmpty>
                  <CommandGroup>
                    {categories.map((category) => (
                      <CommandItem
                        key={category}
                        value={category}
                        onSelect={() => handleSelectCategory(category)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === category ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="truncate">{category}</span>
                      </CommandItem>
                    ))}
                    {searchTerm.trim() && !categories.includes(searchTerm.trim()) && (
                      <CommandItem
                        value={searchTerm.trim()}
                        onSelect={handleCreateNew}
                        className="text-primary"
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        <span className="truncate">Criar "{searchTerm.trim()}"</span>
                      </CommandItem>
                    )}
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


