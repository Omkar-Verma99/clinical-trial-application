/**
 * Suppress non-critical warnings
 * - Turbopack source map warnings on Windows
 */

const originalError = console.error;

console.error = function (...args) {
  const message = args[0]?.toString?.() || '';
  
  // Suppress source map path warnings on Windows
  if (message.includes('source map') || message.includes('SourceMap')) {
    return;
  }
  
  // Suppress source map warnings from Next.js Turbopack
  if (
    message.includes('Invalid source map') &&
    (message.includes('turbopack.js') || 
     message.includes('router-server.js') ||
     message.includes('start-server.js') ||
     message.includes('sourceMapURL could not be parsed'))
  ) {
    return;
  }
  
  originalError.apply(console, args);
};
