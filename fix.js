const fs = require('fs');
const files = ['frontend/src/App.tsx'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/\\`/g, '`');
    content = content.replace(/\\\$/g, '$');
    fs.writeFileSync(file, content);
});
console.log('Fixed files');
