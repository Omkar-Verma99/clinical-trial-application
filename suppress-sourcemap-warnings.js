/**
 * Suppress Next.js Turbopack source map warnings on Windows
 * This is a workaround for a known issue where Turbopack generates
 * source map URLs that Node.js can't parse on Windows systems
 */

const originalError = console.error;

console.error = function (...args) {
  const message = args[0]?.toString?.() || '';
  
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
