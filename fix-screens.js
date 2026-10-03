const fs = require('fs');
const path = require('path');

const screensDir = path.join(__dirname, 'src', 'screens');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // We only target files that render both AppHeader and SafeAreaView in JSX
  if (!content.includes('AppHeader') || !content.includes('<SafeAreaView')) {
    return false;
  }

  // 1. Replace JSX tags
  content = content.replace(/<SafeAreaView(\b)/g, '<View$1');
  content = content.replace(/<\/SafeAreaView>/g, '</View>');

  // 2. Clean up React Native imports
  const rnImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]react-native['"];?/g;
  let match = rnImportRegex.exec(content);
  if (match) {
    let importsStr = match[1];
    // Remove SafeAreaView from the list of imports
    importsStr = importsStr.replace(/\bSafeAreaView\b,?/g, '');
    // Clean up trailing/leading commas or spaces
    importsStr = importsStr.replace(/,\s*,/g, ',');
    importsStr = importsStr.trim().replace(/^,|,$/g, '').trim();

    // Ensure View is imported
    if (!importsStr.split(',').map(s => s.trim()).includes('View')) {
      importsStr = 'View, ' + importsStr;
    }

    content = content.replace(match[0], `import { ${importsStr} } from 'react-native';`);
  }

  // 3. Clean up react-native-safe-area-context imports
  const sacImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]react-native-safe-area-context['"];?/g;
  let sacMatch;
  // We use split and replace to iterate properly on content updates
  let lines = content.split('\n');
  lines = lines.map(line => {
    if (line.includes('react-native-safe-area-context') && line.includes('SafeAreaView')) {
      // Extract imports inside curly braces
      const braceMatch = line.match(/\{([^}]+)\}/);
      if (braceMatch) {
        let importsStr = braceMatch[1];
        importsStr = importsStr.replace(/\bSafeAreaView\b,?/g, '');
        importsStr = importsStr.replace(/,\s*,/g, ',');
        importsStr = importsStr.trim().replace(/^,|,$/g, '').trim();

        if (importsStr === '') {
          return ''; // Mark line for deletion
        } else {
          return line.replace(/\{([^}]+)\}/, `{ ${importsStr} }`);
        }
      }
    }
    return line;
  });

  // Filter out empty lines from deletion
  content = lines.filter(line => line !== '').join('\n');

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.tsx')) {
      try {
        if (fixFile(fullPath)) {
          console.log(`Corrigido: ${file}`);
        }
      } catch (err) {
        console.error(`Erro ao corrigir ${file}:`, err);
      }
    }
  });
}

console.log('Escaneando src/screens para corrigir SafeAreaView redundantes...');
scanDir(screensDir);
console.log('Pronto!');
