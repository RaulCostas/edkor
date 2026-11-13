
const http = require('http');

http.get('http://localhost:3001/anticipos', (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json.map(x => ({ id: x.id, fecha: x.fecha })), null, 2));
        } catch (e) { console.log(data); }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
