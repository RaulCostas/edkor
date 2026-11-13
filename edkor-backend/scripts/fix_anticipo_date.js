
const http = require('http');

const data = JSON.stringify({
    fecha: '2026-01-27'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/anticipos/1',
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
