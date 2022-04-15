const path = require('path');

const generalConfig = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};

const nodeConfig = {
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist', 'cjs'),
    filename: 'index.js',
    libraryTarget: 'umd',
    libraryExport: 'default',
  },
  ...generalConfig,
};

const esmConfig = {
  output: {
    path: path.resolve(__dirname, 'dist', 'mjs'),
    filename: 'index.js',
    libraryTarget: 'module',
    chunkFormat: 'module',
  },
  experiments: {
    outputModule: true,
  },
  ...generalConfig,
};

const browserConfig = {
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'dist', 'browser'),
    filename: 'aria2-lib.js',
    library: {
      name: 'Aria2',
      export: 'default',
      type: 'window',
    },
  },
  ...generalConfig,
};

module.exports = [nodeConfig, esmConfig, browserConfig];
