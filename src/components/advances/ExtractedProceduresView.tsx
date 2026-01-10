import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ExtractedProcedure {
  code: string
  description: string
  value: number | null
}

interface ExtractedProceduresViewProps {
  documentId: string
  onClose: () => void
}

export function ExtractedProceduresView({ documentId, onClose }: ExtractedProceduresViewProps) {
  const [procedures, setProcedures] = useState<ExtractedProcedure[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExtractedProcedures()
  }, [documentId])

  const loadExtractedProcedures = async () => {
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      console.log('[ExtractedProceduresView] Loading document:', documentId)

      const response = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Erro ao carregar documento')

      const doc = await response.json()
      console.log('[ExtractedProceduresView] Document:', doc)

      // Get extracted data from document
      const docResponse = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!docResponse.ok) throw new Error('Erro ao carregar dados extraídos')

      const docData = await docResponse.json()
      console.log('[ExtractedProceduresView] Document data:', docData)

      if (docData.extracted_data && docData.extracted_data.procedures) {
        setProcedures(docData.extracted_data.procedures)
      } else {
        setProcedures([])
      }
    } catch (err: any) {
      console.error('[ExtractedProceduresView] Error:', err)
      toast.error(err.message || 'Erro ao carregar procedimentos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Procedimentos Extraídos do PDF</DialogTitle>
          <DialogDescription>
            Abaixo estão os procedimentos extraídos automaticamente do PDF. O pareamento será feito posteriormente.
          </DialogDescription>
        </DialogHeader>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Extraído</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{procedures.length}</div>
          </CardContent>
        </Card>

        {procedures.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum procedimento extraído</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procedures.map((proc, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{proc.code}</TableCell>
                    <TableCell>{proc.description}</TableCell>
                    <TableCell className="text-right">
                      {proc.value ? `€ ${proc.value.toFixed(2)}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
