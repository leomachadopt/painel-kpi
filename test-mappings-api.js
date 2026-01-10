import http from 'http';

const documentId = '236cbe49-fb43-44ea-8ae5-0d0e6090c9ef';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/insurance/documents/${documentId}/mappings`,
  method: 'GET',
  headers: {
    'Authorization': 'Bearer fake-token-for-testing'
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);

    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log(`✅ Total mappings: ${json.length}`);

      if (json.length > 0) {
        console.log('\nFirst mapping:');
        console.log(JSON.stringify(json[0], null, 2));

        console.log('\nFields available:');
        console.log(Object.keys(json[0]).join(', '));
      }
    } else {
      console.log('❌ Error response:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.end();
