/* global __dirname, require, module */

const webpack = require('webpack');
const path = require('path');
const env = require('yargs').argv.env; // use --env with webpack 2
const pkg = require('./package.json');

let libraryName = pkg.name;

let outputFile, mode, sourcemap, workerFile = 'prime-worker.min.js';

if (env === 'build') {
  mode = 'production';
  outputFile = libraryName + '.min.js';
  sourcemap = false;
} else {
  mode = 'development';
  outputFile = libraryName + '.js';
  sourcemap = 'inline-source-map';
}

const config = {
  mode: mode,
  entry: {
    [outputFile]: __dirname + '/src/discourse.js',
    [workerFile]: __dirname + '/node_modules/node-forge/dist/prime.worker.min.js'
  },
  devtool: sourcemap,
  output: {
    path: __dirname + '/lib',
    filename: '[name]',
    chunkFilename: '[name].js',
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /(\.jsx|\.js)$/,
        loader: 'eslint-loader',
        exclude: [/node_modules/, /vendor/]
      }
    ]
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ],
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./src')],
    extensions: ['.json', '.js']
  },
  devServer: {
    contentBase: path.join(__dirname, 'dev'),
    compress: true,
    port: 9000
  }
};

module.exports = config;
