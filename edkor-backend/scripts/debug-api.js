

async function testApi() {
    try {
        console.log('Fetching http://localhost:3001/comision-tarjeta ...');
        const response = await fetch('http://localhost:3001/comision-tarjeta');
        console.log('Status:', response.status);

        if (!response.ok) {
            console.error('Response not ok');
            return;
        }

        const data = await response.json();
        console.log('Data Type:', typeof data);
        console.log('Is Array?', Array.isArray(data));
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testApi();

