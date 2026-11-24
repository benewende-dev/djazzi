// DJAZZI(08/11/2026): the phone's fonts (djazzi-text.tsx). Added by
// scripts/brand.mjs to the build's babel.config.js, it points the app's own
// screens' Text and TextInput at Djazzi's, which set Inter and Source
// Serif 4; the repository's files stay as they are.
//
//   import { Text, View } from 'react-native'
//     → import { View } from 'react-native'; import { Text } from '…/djazzi-text'
'use strict';

const path = require('node:path');

const MOVED = new Set(['Text', 'TextInput']);

module.exports = function djazziFonts({ types: t }, options = {}) {
  const root = options.root; // the app's src/
  const wrapper = options.wrapper; // djazzi-text.tsx, absolute
  const mine = (file) => !!file && file.startsWith(root + path.sep) && path.resolve(file) !== wrapper && !file.includes(`${path.sep}node_modules${path.sep}`);
  const nameOf = (n) => (t.isIdentifier(n) ? n.name : n.value);
  return {
    name: 'djazzi-fonts',
    visitor: {
      ImportDeclaration(p, state) {
        const node = p.node;
        if (node.source.value !== 'react-native' || node.importKind === 'type' || !mine(state.filename)) return;
        const moved = node.specifiers.filter((s) => t.isImportSpecifier(s) && s.importKind !== 'type' && MOVED.has(nameOf(s.imported)));
        if (!moved.length) return;
        p.insertAfter(t.importDeclaration(moved.map((s) => t.importSpecifier(t.identifier(s.local.name), t.identifier(nameOf(s.imported)))), t.stringLiteral(wrapper)));
        node.specifiers = node.specifiers.filter((s) => !moved.includes(s));
        if (!node.specifiers.length) p.remove();
      },
    },
  };
};
