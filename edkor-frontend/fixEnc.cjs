const fs = require('fs');

function fixEncoding(filePath) {
    let content = fs.readFileSync(filePath, 'latin1');
    content = Buffer.from(content, 'latin1').toString('utf8');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed encoding:', filePath);
}

const files = process.argv.slice(2);
for (let file of files) {
    fixEncoding(file);
}
