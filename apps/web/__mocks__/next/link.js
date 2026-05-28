const React = require('react');

// Renderiza como <a> estándar para tests
function Link({ href, children, className, ...props }) {
  return React.createElement('a', { href, className, ...props }, children);
}

module.exports = Link;
module.exports.default = Link;
