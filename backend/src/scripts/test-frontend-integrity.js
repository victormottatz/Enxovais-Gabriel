import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('frontend/index.html');
const jsPath = path.resolve('frontend/app.js');
const cssPath = path.resolve('frontend/styles.css');

const html = fs.readFileSync(htmlPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

console.log('=== TESTE DE INTEGRIDADE FRONTEND: ENXOVAIS GABRIEL ===');

// 1. Extração de onclicks
const onclickRegex = /onclick="([^"]+)"|onclick='([^']+)'/g;
let match;
const handlers = new Set();
while ((match = onclickRegex.exec(html)) !== null) {
  handlers.add(match[1] || match[2]);
}

console.log(`\n1. Verificando ${handlers.size} chamadas inline de onclick no HTML:`);
const missingFunctions = [];
handlers.forEach((h) => {
  const fnMatch = h.match(/^([a-zA-Z0-9_$]+)\s*\(/);
  if (fnMatch) {
    const fnName = fnMatch[1];
    const regex = new RegExp(`function\\s+${fnName}\\s*\\(|window\\.${fnName}\\s*=|const\\s+${fnName}\\s*=\\s*\\(`);
    const exists = regex.test(js) || js.includes(`${fnName}(`) || js.includes(`function ${fnName}`);
    if (exists) {
      console.log(`  ✅ ${fnName}`);
    } else {
      console.log(`  ❌ FUNÇÃO FALTANDO: ${fnName}`);
      missingFunctions.push(fnName);
    }
  }
});

// 2. Verificação de IDs de Modais
const modalIdRegex = /(?:fecharModal|abrirModal)\(['"]([^'"]+)['"]/g;
const modalIds = new Set();
let mMatch;
while ((mMatch = modalIdRegex.exec(html)) !== null) modalIds.add(mMatch[1]);
while ((mMatch = modalIdRegex.exec(js)) !== null) modalIds.add(mMatch[1]);

console.log(`\n2. Verificando ${modalIds.size} IDs de modais usados em abrirModal/fecharModal:`);
const missingModalIds = [];
modalIds.forEach((id) => {
  const exists = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  if (exists) {
    console.log(`  ✅ Modal ID existente: #${id}`);
  } else {
    console.log(`  ❌ MODAL ID FALTANDO NO HTML: #${id}`);
    missingModalIds.push(id);
  }
});

// 3. Verificação de Formulários onsubmit
const onsubmitRegex = /onsubmit="([^"]+)"|onsubmit='([^']+)'/g;
const forms = [];
let oMatch;
while ((oMatch = onsubmitRegex.exec(html)) !== null) {
  forms.push(oMatch[1] || oMatch[2]);
}
console.log(`\n3. Verificando ${forms.length} formulários com onsubmit:`);
forms.forEach((f) => {
  const fnMatch = f.match(/^([a-zA-Z0-9_$]+)\s*\(/);
  if (fnMatch) {
    const fnName = fnMatch[1];
    const exists = js.includes(`function ${fnName}`) || js.includes(`${fnName} =`);
    console.log(`  ${exists ? '✅' : '❌'} onsubmit: ${fnName}`);
  }
});

// 4. Verificação de Element IDs acessados no app.js
const getElementByIdRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
const elementIdsInJs = new Set();
let elemMatch;
while ((elemMatch = getElementByIdRegex.exec(js)) !== null) {
  elementIdsInJs.add(elemMatch[1]);
}

console.log(`\n4. Verificando ${elementIdsInJs.size} elementos acessados via document.getElementById no app.js:`);
const missingElementIds = [];
elementIdsInJs.forEach((id) => {
  const existsInHtml = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  if (!existsInHtml) {
    console.log(`  ⚠️ Element ID não encontrado no HTML estático (pode ser gerado dinamicamente): #${id}`);
    missingElementIds.push(id);
  }
});

console.log(`\nTotal IDs não encontrados no HTML estático: ${missingElementIds.length}`);

// 5. Validador de Aninhamento e Fechamento de Tags HTML
console.log(`\n5. Verificando fechamento e aninhamento de tags HTML:`);
const tagRegex = /<\/?([a-zA-Z0-9-]+)(?:\s+[^>]*)?>/g;
let tMatch;
const stack = [];
let line = 1;
let lastIndex = 0;
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

while ((tMatch = tagRegex.exec(html)) !== null) {
  const fullTag = tMatch[0];
  const tagName = tMatch[1].toLowerCase();
  
  const textBefore = html.slice(lastIndex, tMatch.index);
  line += (textBefore.match(/\n/g) || []).length;
  lastIndex = tMatch.index;

  if (voidTags.has(tagName) || fullTag.endsWith('/>')) {
    continue;
  }

  if (fullTag.startsWith('</')) {
    if (stack.length === 0) {
      console.log(`  ❌ Tag de fechamento extra: </${tagName}> na linha ${line}`);
    } else {
      const top = stack.pop();
      if (top.name !== tagName) {
        console.log(`  ❌ Incompatibilidade de tag: esperava </${top.name}> (aberta na linha ${top.line}${top.id ? ' #' + top.id : ''}), mas recebeu </${tagName}> na linha ${line}`);
      }
    }
  } else {
    const idMatch = fullTag.match(/id="([^"]+)"|id='([^']+)'/);
    const id = idMatch ? (idMatch[1] || idMatch[2]) : '';
    stack.push({ name: tagName, line, id, fullTag });
  }
}

if (stack.length > 0) {
  console.log(`  ❌ Existem ${stack.length} tags abertas que NÃO foram fechadas:`);
  stack.forEach((s) => console.log(`     - <${s.name}${s.id ? ' id="' + s.id + '"' : ''}> aberta na linha ${s.line}`));
} else {
  console.log(`  ✅ Todas as tags HTML foram fechadas corretamente!`);
}

