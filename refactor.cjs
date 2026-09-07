const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./src/pages');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/text-slate-900/g, 'text-white');
  content = content.replace(/text-slate-800/g, 'text-slate-200');
  content = content.replace(/bg-white/g, 'bg-slate-900/50');
  content = content.replace(/bg-slate-50/g, 'bg-black');
  content = content.replace(/border-slate-200/g, 'border-slate-800');
  content = content.replace(/border-slate-300/g, 'border-slate-700');
  content = content.replace(/divide-slate-100/g, 'divide-slate-800');
  content = content.replace(/text-slate-700/g, 'text-slate-300');
  
  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
