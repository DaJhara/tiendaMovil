const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const config = getDefaultConfig(__dirname);

// Permitir que Metro reconozca archivos WebAssembly (.wasm).
config.resolver.assetExts = [
...new Set([...config.resolver.assetExts, 'wasm']),
];

// Evitar que Metro indexe la carpeta backend/.
const backend = new RegExp(
'^' + escape(path.join(__dirname, 'backend')) + '[\\/].*'
);

const current = config.resolver.blockList;

config.resolver.blockList = [
...(Array.isArray(current)
? current
: current
? [current]
: []),
backend,
];

module.exports = config;
