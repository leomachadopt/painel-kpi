import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Star, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SurveyData {
  id: string
  patientName: string
  clinic: {
    id: string
    name: string
    logoUrl?: string
    npsQuestion?: string
  }
  surveyMonth: number
  surveyYear: number
  expiresAt: string
}

export default function NPSSurvey() {
  const { token } = useParams<{ token: string }>()

  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [survey, setSurvey] = useState<SurveyData | null>(null)

  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSurvey()
  }, [token])

  const loadSurvey = async () => {
    if (!token) {
      setError('Token inválido.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/public/nps/${token}`)

      if (!response.ok) {
        const data = await response.json()

        if (data.alreadyResponded) {
          setError('Esta pesquisa já foi respondida.')
        } else if (data.expired) {
          setError('Esta pesquisa expirou.')
        } else {
          setError('Pesquisa não encontrada.')
        }

        setLoading(false)
        return
      }

      const data = await response.json()
      setSurvey(data)
    } catch (error) {
      console.error('Error loading survey:', error)
      setError('Erro ao carregar pesquisa.')
    } finally {
      setLoading(false)
    }
  }

  const submitResponse = async () => {
    if (selectedScore === null) {
      toast.error('Por favor, selecione uma nota de 0 a 10')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch(`/api/public/nps/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: selectedScore,
          feedback: feedback.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit response')
      }

      setSubmitted(true)
      toast.success('Obrigado pela sua avaliação!')
    } catch (error: any) {
      console.error('Error submitting response:', error)
      toast.error(error.message || 'Erro ao enviar resposta')
    } finally {
      setSubmitting(false)
    }
  }

  const getScoreColor = (score: number) => {
    // Escala neutra - sem indução de sentimento
    return 'bg-primary hover:bg-primary/90 border-primary'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="py-20 text-center">
            <p className="text-lg text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="py-20 text-center">
            <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Ops!</h2>
            <p className="text-lg text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-2xl mx-4">
          <CardContent className="py-20 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Obrigado!</h2>
            <p className="text-xl text-muted-foreground">
              Agradecemos pela sua contribuição para que possamos melhorar cada dia mais!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center pb-8">
          {survey?.clinic.logoUrl && (
            <img
              src={survey.clinic.logoUrl}
              alt={survey.clinic.name}
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          <CardTitle className="text-3xl font-bold mb-2">
            {survey?.clinic.name}
          </CardTitle>
          <p className="text-muted-foreground text-lg">
            Olá, {survey?.patientName}!
          </p>
          <p className="text-muted-foreground mt-2">
            {survey?.clinic.npsQuestion ||
              'Gostaríamos de saber o quanto você recomendaria nossa clínica para um amigo ou familiar?'}
          </p>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Score Selection */}
          <div className="space-y-4">
            <Label className="text-center block text-lg font-semibold">
              Em uma escala de 0 a 10, qual nota você daria?
            </Label>

            <div className="grid grid-cols-11 gap-2">
              {[...Array(11)].map((_, i) => (
                <Button
                  key={i}
                  variant={selectedScore === i ? 'default' : 'outline'}
                  className={`h-14 text-lg font-semibold transition-all ${
                    selectedScore === i
                      ? getScoreColor(i) + ' text-white'
                      : 'hover:scale-105'
                  }`}
                  onClick={() => setSelectedScore(i)}
                >
                  {i}
                </Button>
              ))}
            </div>

            <div className="flex justify-between text-sm text-muted-foreground px-1">
              <span>Improvável</span>
              <span>Muito provável</span>
            </div>
          </div>

          {/* Feedback (sempre opcional) */}
          {selectedScore !== null && (
            <div className="space-y-2">
              <Label htmlFor="feedback">
                {selectedScore < 7
                  ? 'O que podemos fazer para melhorar?'
                  : 'Gostaria de deixar um comentário?'} (opcional)
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={selectedScore < 7
                  ? "Compartilhe suas sugestões de melhoria..."
                  : "Conte-nos mais sobre sua experiência..."}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {feedback.length}/500
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={submitResponse}
            disabled={selectedScore === null || submitting}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {submitting ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Suas respostas são confidenciais e nos ajudam a melhorar nossos
            serviços.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
