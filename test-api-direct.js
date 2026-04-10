import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('\n🔍 Testing /api/clinics endpoint directly...\n');

    const response = await fetch('http://localhost:3001/api/clinics', {
      headers: {
        'Authorization': `Bearer ${process.env.TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTE3Njc5NDk4MDM3MjUiLCJpYXQiOjE3Mzg3ODMzOTR9.pFG4xJ3KeZe--5fV2-nYvHY0O9d8yO7jlwkQKWEZXyg'}`
      }
    });

    const data = await response.json();
    const clinic = data.find(c => c.id === 'clinic-1767296701478');

    if (!clinic) {
      console.log('❌ Clínica não encontrada!');
      return;
    }

    console.log(`✅ Clínica encontrada: ${clinic.name}`);
    console.log(`\n👨‍⚕️ Total de médicos: ${clinic.configuration.doctors.length}\n`);

    clinic.configuration.doctors.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name} (ID: ${doc.id})`);
    });

    const phantom = clinic.configuration.doctors.find(d => d.id === 'clinic-1767296701478-doc-dr.-joão-silva');
    if (phantom) {
      console.log('\n❌ MÉDICO FANTASMA ENCONTRADO NA API!');
      console.log(JSON.stringify(phantom, null, 2));
    } else {
      console.log('\n✅ Médico fantasma NÃO encontrado na API');
    }

    const cristiane = clinic.configuration.doctors.find(d => d.name.includes('Cristiane'));
    if (cristiane) {
      console.log('\n✅ Dra. Cristiane Martins encontrada:');
      console.log(`   ID: ${cristiane.id}`);
      console.log(`   Nome: ${cristiane.name}`);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testAPI();
