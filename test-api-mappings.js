import jwt from 'jsonwebtoken';

(async () => {
  const token = jwt.sign(
    { id: 'admin-id', clinicId: 'clinic-1767296701478', role: 'ADMIN' },
    'your-secret-key'
  );

  const documentId = '236cbe49-fb43-44ea-8ae5-0d0e6090c9ef';

  try {
    const response = await fetch(`http://localhost:3001/api/insurance/documents/${documentId}/mappings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.log('Status:', response.status);
      console.log('Response:', await response.text());
      return;
    }

    const data = await response.json();
    console.log('✅ Total mappings returned:', data.length);
    console.log('\nFirst 3 mappings:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));

    // Check field structure
    if (data.length > 0) {
      console.log('\nFields in first mapping:');
      console.log(Object.keys(data[0]));
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
