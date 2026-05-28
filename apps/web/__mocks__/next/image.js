const React = require('react');

// Renderiza como <img> estándar para tests
function Image({ src, alt, width, height, className, fill, ...props }) {
  return React.createElement('img', { src, alt, width, height, className, ...props });
}

module.exports = Image;
module.exports.default = Image;
