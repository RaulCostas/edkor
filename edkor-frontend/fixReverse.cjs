const fs = require('fs');
const parser = require('@babel/parser');

function fixFileReverse(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // To handle https:// safely, let's use a split token
    // But JS doesn't have lookbehinds in old engines, wait Node 22 has it.
    let parts = content.split(/(?<!https?:)\/\//g);
    if (parts.length === 1) {
        return false;
    }

    let fixedParts = [];
    // The last part has no subsequent comments
    fixedParts[parts.length - 1] = parts[parts.length - 1];
    
    // Go backwards!
    for (let i = parts.length - 1; i >= 1; i--) {
        let part = parts[i];
        let bestCode = null;
        
        let maxSearch = Math.min(part.length, 300);
        
        // The prefix is everything before this comment
        let prefix = parts[0];
        for (let k = 1; k < i; k++) {
            // For preceding comments, we just use the raw text and let them swallow whatever
            // But wait! If preceding comments swallow the code, the AST might still be invalid!
            // Wait, if preceding comments swallow the code, the file is ALREADY syntactically invalid!
            // So Babel will throw an error EVEN IF we fix the current comment!
            
            // To fix this, we should replace preceding comments with something harmless, or just use /* */
            // Actually, we can just replace them with /* */ up to the first space.
            let fallback = parts[k].indexOf(' ') !== -1 ? parts[k].indexOf(' ') : Math.min(10, parts[k].length);
            prefix += '/* ' + parts[k].substring(0, fallback) + ' */\n' + parts[k].substring(fallback);
        }
        
        for (let j = 0; j <= maxSearch; j++) {
            let testComment = part.substring(0, j);
            let testCode = part.substring(j);
            
            let fullTestString = prefix + '//' + testComment + '\n' + testCode;
            // Append the ALREADY FIXED subsequent parts
            for (let k = i + 1; k < parts.length; k++) {
                fullTestString += fixedParts[k]; 
            }
            
            try {
                parser.parse(fullTestString, {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript']
                });
                
                // IT PARSED!
                bestCode = '//' + testComment + '\n' + testCode;
                console.log('Found valid newline at pos', j, 'for comment', i, 'in', filePath);
                break;
            } catch (e) {
                // keep trying
            }
        }
        
        if (bestCode) {
            fixedParts[i] = bestCode;
        } else {
            console.log('Warning: Could not find valid newline for comment', i, 'in', filePath);
            // Fallback heuristic
            let fallback = part.indexOf(' ') !== -1 ? part.indexOf(' ') : Math.min(50, part.length);
            fixedParts[i] = '/* ' + part.substring(0, fallback) + ' */\n' + part.substring(fallback);
        }
    }

    // Now reconstruct the full file
    let finalCode = parts[0];
    for (let i = 1; i < parts.length; i++) {
        finalCode += fixedParts[i];
    }
    
    fs.writeFileSync(filePath, finalCode, 'utf8');
    return true;
}

const files = process.argv.slice(2);
for (let file of files) {
    try {
        if (fixFileReverse(file)) {
            console.log('Processed:', file);
        }
    } catch(e) {
        console.error('Error in', file, e);
    }
}
