const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project();

// Load all project files in the required directories
project.addSourceFilesAtPaths([
  path.join(__dirname, '../app/**/*.ts'),
  path.join(__dirname, '../app/**/*.tsx'),
  path.join(__dirname, '../lib/**/*.ts'),
  path.join(__dirname, '../lib/**/*.tsx'),
  path.join(__dirname, '../hooks/**/*.ts'),
  path.join(__dirname, '../hooks/**/*.tsx'),
  path.join(__dirname, '../constants/**/*.ts'),
  path.join(__dirname, '../constants/**/*.tsx'),
  path.join(__dirname, '../components/**/*.ts'),
  path.join(__dirname, '../components/**/*.tsx')
]);

const sourceFiles = project.getSourceFiles();

let totalRemoved = 0;

for (const sourceFile of sourceFiles) {
  let fileChanged = false;

  // Find all ExpressionStatements
  const expressions = sourceFile.getDescendantsOfKind(SyntaxKind.ExpressionStatement);

  for (const expr of expressions) {
    const callExpr = expr.getExpressionIfKind(SyntaxKind.CallExpression);
    if (callExpr) {
      const propAccess = callExpr.getExpressionIfKind(SyntaxKind.PropertyAccessExpression);
      if (propAccess) {
        const obj = propAccess.getExpression().getText();
        const prop = propAccess.getName();

        if (obj === 'console' && (prop === 'log' || prop === 'warn' || prop === 'error')) {
          expr.remove();
          fileChanged = true;
          totalRemoved++;
        }
      }
    }
  }

  if (fileChanged) {
    sourceFile.saveSync();
    console.log(`Saved changes to: ${sourceFile.getFilePath()}`);
  }
}

console.log(`Total console statements removed: ${totalRemoved}`);
