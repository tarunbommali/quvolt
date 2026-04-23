const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');
const stylesTokens = new Set([
    'buttonStyles', 'cards', 'cx', 'theme', 'typography', 'spacing', 'navbar', 
    'components', 'layout', 'forms', 'textStyles', 'tagStyles', 'controlStyles', 
    'panelStyles', 'formStyles', 'motionStyles', 'dividerStyles'
]);

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regex to match imports from styles directory
    // e.g. import { typography } from '../../../styles/typography';
    // Match group 1: imported symbols
    // Match group 2: path up to styles/
    const importRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]((?:\.\.\/)+styles)\/([a-zA-Z0-9_]+)['"];?/g;
    
    let match;
    let foundSymbols = new Set();
    let relativeStylesPath = null;
    let hasChanges = false;
    
    let newContent = content;

    // First pass: collect all symbols and path, and remove the imports
    let matchedLines = [];
    while ((match = importRegex.exec(content)) !== null) {
        const symbolsStr = match[1];
        const basePath = match[2];
        const moduleName = match[3];

        if (moduleName === 'useTheme') continue; // keep useTheme separate
        if (moduleName === 'index') continue; // already consolidated

        const symbols = symbolsStr.split(',').map(s => s.trim()).filter(Boolean);
        
        let allTokensValid = true;
        symbols.forEach(s => {
            if (stylesTokens.has(s)) {
                foundSymbols.add(s);
            } else {
                allTokensValid = false;
            }
        });

        if (allTokensValid) {
            relativeStylesPath = basePath;
            matchedLines.push(match[0]);
            hasChanges = true;
        }
    }

    if (hasChanges && foundSymbols.size > 0 && relativeStylesPath) {
        // Remove old imports
        matchedLines.forEach(line => {
            newContent = newContent.replace(line, '');
        });

        // Also if the file ALREADY had an import from styles/index, we should merge with it!
        const existingIndexRegex = new RegExp(`import\\s+\\{\\s*([^}]+)\\s*\\}\\s+from\\s+['"]${relativeStylesPath.replace(/\./g, '\\.')}\\/index['"];?`);
        const existingMatch = newContent.match(existingIndexRegex);
        
        if (existingMatch) {
            const existingSymbols = existingMatch[1].split(',').map(s => s.trim()).filter(Boolean);
            existingSymbols.forEach(s => foundSymbols.add(s));
            newContent = newContent.replace(existingMatch[0], '');
        }

        // Clean up empty lines left behind
        newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');

        // Create new import
        const newImport = `import { ${Array.from(foundSymbols).join(', ')} } from '${relativeStylesPath}/index';`;
        
        // Inject at the top (after the last React/third-party import, or just at the top)
        // Find the last import statement
        const lastImportIndex = newContent.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
            const endOfLastImport = newContent.indexOf('\n', lastImportIndex);
            newContent = newContent.substring(0, endOfLastImport) + '\n' + newImport + newContent.substring(endOfLastImport);
        } else {
            newContent = newImport + '\n' + newContent;
        }

        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Refactored imports in: ${path.relative(srcDir, filePath)}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (file === 'styles') continue; // Don't process styles dir itself
            walkDir(fullPath);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

console.log('Starting refactor...');
walkDir(srcDir);
console.log('Refactor complete!');
