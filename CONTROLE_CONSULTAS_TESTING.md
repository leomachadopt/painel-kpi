# 🧪 Guia de Testes - Controle de Consultas

Este documento explica como testar cada uma das 4 métricas de Controle de Consultas.

---

## 📋 **Métricas Implementadas**

1. ❌ **Não Comparecimento** (automático)
2. 🔄 **Remarcações** (manual)
3. 🗑️ **Cancelamentos** (manual)
4. 👴 **Marcações Paciente Antigo** (manual)

---

## 🚀 **Pré-requisitos**

1. **Reiniciar o servidor** para ativar o scheduler:
   ```bash
   npm run dev
   ```

2. **Verificar logs** de inicialização:
   ```
   🚀 Server running on http://localhost:3001
   📊 API available at http://localhost:3001/api
   🕒 Marketing scheduler armed...
   🕒 No-show checker armed (next run: ...)  ← DEVE APARECER
   ```

---

## ✅ **TESTE 1: Marcações Paciente Antigo** 👴

### **Objetivo:** Verificar se o contador incrementa ao criar agendamento com checkbox marcado

### **Passos:**

1. Acessar **Agenda** da clínica
2. Clicar em um **horário vazio**
3. No modal "Criar Agendamento":
   - **NÃO** marcar "Paciente Novo"
   - **NÃO** marcar "Remarcação (do banco)"
   - ✅ **MARCAR** checkbox **"👴 Retorno de paciente antigo"**
   - Selecionar paciente existente (ou criar novo)
   - Preencher médico, consultório, tipo de consulta
   - Clicar em **"Criar Agendamento"**

4. Verificar no **Dashboard** → **Controle de Consultas**:
   - Métrica **"Marcações (Paciente Antigo)"** deve ter **incrementado +1**

### **Validação no Banco:**
```sql
SELECT * FROM daily_consultation_control_entries
WHERE date = '2026-04-10'  -- data de hoje
  AND clinic_id = 'sua-clinica-id';
```
- `old_patient_booking` deve ser **>= 1**

---

## ✅ **TESTE 2: Cancelamentos** 🗑️

### **Objetivo:** Verificar se o contador incrementa ao excluir consulta

### **Passos:**

1. Acessar **Agenda** da clínica
2. Clicar em uma **consulta existente**
3. No modal "Detalhes do Agendamento":
   - Clicar no botão **"Excluir"** (botão vermelho)
   - Confirmar exclusão

4. Verificar no **Dashboard** → **Controle de Consultas**:
   - Métrica **"Cancelamentos"** deve ter **incrementado +1**

### **Validação no Banco:**
```sql
SELECT * FROM daily_consultation_control_entries
WHERE date = '2026-04-10'
  AND clinic_id = 'sua-clinica-id';
```
- `cancelled` deve ser **>= 1**
- Appointment deve ter sido **deletado** da tabela `appointments`

---

## ✅ **TESTE 3: Remarcações** 🔄

### **Objetivo:** Verificar se o contador incrementa ao remarcar consulta

### **Passos:**

1. Acessar **Agenda** da clínica
2. Clicar em uma **consulta existente**
3. No modal "Detalhes do Agendamento":
   - Rolar até o final
   - Clicar no botão **"📅 Remarcar Consulta"**
4. No modal "Enviar para Banco de Remarcações":
   - Adicionar motivo (opcional)
   - Clicar em **"Adicionar ao Banco"**

5. Verificar:
   - Mensagem: **"Paciente adicionado ao banco de remarcações"**
   - Paciente aparece em **Relatórios** → **Banco de Remarcações**

6. Verificar no **Dashboard** → **Controle de Consultas**:
   - Métrica **"Remarcações"** deve ter **incrementado +1**

### **Validação no Banco:**
```sql
-- Verificar métrica
SELECT * FROM daily_consultation_control_entries
WHERE date = '2026-04-10'
  AND clinic_id = 'sua-clinica-id';
-- rescheduled deve ser >= 1

-- Verificar banco de remarcações
SELECT * FROM pending_reschedules
WHERE clinic_id = 'sua-clinica-id';
-- deve ter 1 registro

-- Verificar status do appointment
SELECT id, status FROM appointments
WHERE id = 'appointment-id';
-- status deve ser 'rescheduled'
```

---

## ✅ **TESTE 4: Não Comparecimento (Automático)** ❌

### **Objetivo:** Verificar se o job automático marca consultas sem "Paciente chegou?" como no_show

### **Teste Manual (Recomendado):**

#### **Opção A: Testar a função diretamente**

1. Criar uma consulta para **hoje**
2. **NÃO** marcar checkbox **"Paciente chegou?"**
3. No terminal do servidor, executar:
   ```bash
   node -e "import('./server/noShowChecker.js').then(m => m.runNoShowCheckForAllClinics('2026-04-10'))"
   ```
   *(substituir pela data de hoje)*

4. Verificar logs:
   ```
   [NO_SHOW_CHECKER] Running no-show check for date: 2026-04-10
   [NO_SHOW_CHECKER] Found X appointments without arrival
   [NO_SHOW_CHECKER] Marked as no_show: P-0001 - PACIENTE NOME
   [NO_SHOW_CHECKER] Processed X/X appointments
   ```

5. Verificar no **Dashboard**:
   - Métrica **"Não Comparecimento"** incrementada

#### **Opção B: Alterar horário do job para testar**

1. Editar `.env`:
   ```bash
   NO_SHOW_CHECKER_HOUR=14  # horário atual + 1 minuto
   NO_SHOW_CHECKER_MINUTES=30
   ```

2. Reiniciar servidor

3. Criar consulta para hoje e **NÃO** marcar "Paciente chegou?"

4. Aguardar até o horário configurado

5. Verificar logs do servidor:
   ```
   ⏰ Running no-show check for 2026-04-10...
   ✅ No-show check finished: 1 marked as no-show
   ```

#### **Opção C: Esperar até 23:59**

1. Criar consulta para hoje
2. **NÃO** marcar "Paciente chegou?"
3. Deixar servidor rodando
4. Às 23:59, verificar logs e dashboard

### **Validação no Banco:**
```sql
-- Verificar métrica
SELECT * FROM daily_consultation_control_entries
WHERE date = '2026-04-10'
  AND clinic_id = 'sua-clinica-id';
-- no_show deve ser >= 1

-- Verificar status do appointment
SELECT id, status, actual_arrival FROM appointments
WHERE date = '2026-04-10'
  AND clinic_id = 'sua-clinica-id';
-- status deve ser 'no_show'
-- actual_arrival deve ser NULL
```

---

## 🎯 **Teste Completo - Cenário Real**

### **Dia 1 - Manhã:**
1. Criar 5 consultas para hoje
2. Marcar 2 delas com checkbox **"👴 Retorno de paciente antigo"**
   - **Resultado esperado:** `old_patient_booking = 2`

### **Dia 1 - Tarde:**
3. Marcar **"Paciente chegou?"** em 3 consultas
4. Remarcar 1 consulta
   - **Resultado esperado:** `rescheduled = 1`
5. Excluir 1 consulta
   - **Resultado esperado:** `cancelled = 1`

### **Dia 1 - 23:59:**
6. Job automático executa:
   - 5 consultas criadas
   - 3 marcadas como "Paciente chegou"
   - 1 remarcada
   - 1 excluída
   - **Restam:** 5 - 3 - 1 - 1 = **0 consultas sem chegada**
   - **Resultado esperado:** `no_show = 0`

### **Dashboard Final:**
```
Não Comparecimento:          0   ✓
Remarcações:                 1   ✓
Cancelamentos:               1   ✓
Marcações (Paciente Antigo): 2   ✓
```

---

## 📊 **Verificação Geral**

### **Query Útil - Resumo do Dia:**
```sql
SELECT
  date,
  no_show AS "Não Comparecimento",
  rescheduled AS "Remarcações",
  cancelled AS "Cancelamentos",
  old_patient_booking AS "Paciente Antigo"
FROM daily_consultation_control_entries
WHERE clinic_id = 'sua-clinica-id'
  AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC;
```

---

## ⚙️ **Configurações**

### **Variáveis de Ambiente (.env):**
```bash
# Job de No-Show
NO_SHOW_CHECKER_ENABLED=true    # Ativar/desativar job
NO_SHOW_CHECKER_HOUR=23         # Hora de execução (0-23)
NO_SHOW_CHECKER_MINUTES=59      # Minutos (0-59)
```

### **Desabilitar Job Temporariamente:**
```bash
NO_SHOW_CHECKER_ENABLED=false
```

---

## 🐛 **Troubleshooting**

### **Problema: Job não está rodando**
- Verificar se servidor foi reiniciado após criar os arquivos
- Verificar variável `NO_SHOW_CHECKER_ENABLED=true`
- Verificar logs de inicialização para "No-show checker armed"

### **Problema: Métrica não incrementa**
- Verificar logs do console do navegador (erros HTTP)
- Verificar logs do servidor (erros SQL)
- Verificar se a data está correta (timezone)

### **Problema: Checkbox não aparece**
- Limpar cache do navegador
- Fazer rebuild: `npm run build`
- Verificar se não está marcado "Paciente Novo" ou "Remarcação"

---

## ✅ **Checklist Final**

- [ ] Build passa sem erros
- [ ] Servidor inicia com mensagem "No-show checker armed"
- [ ] Checkbox "Retorno paciente antigo" aparece no modal
- [ ] Criar agendamento com checkbox incrementa métrica
- [ ] Excluir consulta incrementa cancelamentos
- [ ] Remarcar consulta incrementa remarcações
- [ ] Job automático marca no_show às 23:59

---

**🎉 Sistema de Controle de Consultas Totalmente Funcional!**
