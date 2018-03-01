import syntax from 'babel-plugin-syntax-dynamic-import'
import {resolve, relative} from 'path';

// this file is 99% babel.js from loadable-components

const resolveImport = (importName, file) => {
  if (importName.charAt(0) === '.') {
    return relative(process.cwd(), resolve(file, importName));
  }
  return importName;
};

const templateOptions = {
  placeholderPattern: /^([A-Z0-9]+)([A-Z0-9_]+)$/,
};

export default function ({types: t, template}) {
  const headerTemplate = template(
    'function importedWrapper(marker, name, realImport) { return realImport;}',
    templateOptions,
  );

  const importRegistration = template(
    'importedWrapper(MARK, FILE, IMPORT)',
    templateOptions,
  );

  const importCallRegistration = template(
    '() => importedWrapper(MARK, FILE, IMPORT)',
    templateOptions,
  );

  const importAwaitRegistration = template(
    'importedWrapper(MARK, FILE, IMPORT)',
    templateOptions,
  );

  const hasImports = {};
  const visitedNodes = new Map();

  return {
    inherits: syntax,

    visitor: {
      Import({parentPath}, {file}) {
        const localFile = file.opts.filename;
        const newImport = parentPath.node;
        const importName = parentPath.get('arguments')[0].node.value;
        const requiredFile = resolveImport(importName, localFile);

        console.error(parentPath.parentPath.type, importName, requiredFile);

        if (visitedNodes.has(parentPath.node)) {
          return;
        }

        let replace = null;
        if(parentPath.parentPath.type==='ArrowFunctionExpression') {
          replace = importCallRegistration({
            MARK: t.stringLiteral("imported-component"),
            FILE: t.stringLiteral(requiredFile),
            IMPORT: newImport
          });

          hasImports[localFile] = true;
          visitedNodes.set(newImport, true);

          parentPath.parentPath.replaceWith(replace);
        } else {
          replace = importRegistration({
            MARK: t.stringLiteral("imported-component"),
            FILE: t.stringLiteral(requiredFile),
            IMPORT: newImport
          });

          hasImports[localFile] = true;
          visitedNodes.set(newImport, true);

          parentPath.replaceWith(replace);
        }
      },
      Program: {
        exit({node}, {file}) {
          if (!hasImports[file.opts.filename]) return;

          // hasImports[file.opts.filename].forEach(cb => cb());
          node.body.unshift(headerTemplate());

        }
      },
    }
  }
}