const fs = require('fs');
const cp = require('child_process');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'latin1');
    content = Buffer.from(content, 'latin1').toString('utf8');
    
    let parts = content.split(/(?<!https?:)\/\//g);
    if (parts.length === 1) {
        return;
    }

    let currentCode = parts[0];
    
    for (let i = 1; i < parts.length; i++) {
        let part = parts[i];
        let bestIndex = part.length;
        
        let wordsToStopAt = [' const ', ' let ', ' var ', ' if ', ' return ', ' switch ', ' for ', ' {', ' }', '<', '/>', ' Object', ' doc.', ' await ', ' try', ' catch', ' finally', ' window.', ' fetch', ' export ', ' import ', ' function '];
        
        for (let j = 0; j < Math.min(part.length, 250); j++) {
            let next10 = part.substring(j, j + 15);
            let matched = false;
            for (let w of wordsToStopAt) {
                if (next10.startsWith(w)) {
                    matched = true;
                    break;
                }
            }
            if (matched) {
                bestIndex = j;
                break;
            }
        }
        
        currentCode += '/* ' + part.substring(0, bestIndex) + ' */\n' + part.substring(bestIndex);
    }

    fs.writeFileSync(filePath, currentCode, 'utf8');
}

const glob = require('fs');
// Let's just fix HistorialPagos.tsx first
fixFile('src/pages/HistorialPagos.tsx');
try {
    cp.execSync('npx prettier --write src/pages/HistorialPagos.tsx');
    console.log('Success HistorialPagos.tsx');
} catch (e) {
    console.log('Failed Prettier HistorialPagos.tsx');
}
