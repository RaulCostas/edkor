
async function testInitialize() {
    try {
        console.log('Sending request to /chatbot/initialize...');
        const response = await fetch('http://localhost:3001/chatbot/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        console.log('Response Status:', response.status);
        const data = await response.json();
        console.log('Response Data:', data);
    } catch (error) {
        console.log('Error Message:', error.message);
    }
}

testInitialize();
