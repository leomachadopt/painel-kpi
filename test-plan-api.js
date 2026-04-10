// Test script para testar a API de plan procedures
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWNsaW5pYy0xNzY3Mjk2NzAxNDc4Iiwicm9sZSI6IkdFU1RPUl9DTElOSUNBIiwiY2xpbmljSWQiOiJjbGluaWMtMTc2NzI5NjcwMTQ3OCIsImlhdCI6MTc0NDEzMjU4OCwiZXhwIjoxNzQ0MjE4OTg4fQ.z0SjxVvHkYiCiB0x-NI_rAGlAc1bYrUY7P8VGaGEaGM'

const testData = {
  priceTableType: 'clinica',
  procedures: [{
    procedureCode: 'TEST001',
    procedureDescription: 'Teste de procedimento',
    priceAtCreation: 100.00,
    quantity: 1,
    sortOrder: 0
  }]
}

fetch('http://localhost:3001/api/plan-procedures/clinic-1767296701478/60ea30f9-64d5-4f32-8a25-3bb8e6758145', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(testData)
})
.then(res => {
  console.log('Status:', res.status)
  return res.json()
})
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err))
