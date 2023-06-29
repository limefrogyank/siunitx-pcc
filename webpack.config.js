//const { paths } = require('mathjax-full/components/src/dependencies');
//const PACKAGE = require('mathjax-full/components/webpack.common.js');
const PACKAGE = require('./webpackModded');




module.exports = PACKAGE(
  'siunitx',                                // the name of the package to build
  'node_modules/mathjax-full/js',    // location of the mathjax library
  [                                     // packages to link to
    'components/src/core/lib',
    'components/src/input/tex-base/lib'
  ],
  __dirname + '/js',                            // our directory
  '../.'                                   // where to put the packaged component,

);


// module.exports = {
//   context: __dirname,
//   entry: './src/siunitx.ts',
//   mode: 'development',
//   module: {
//     rules: [
//       {
//         test: /\.tsx?$/,
//         use: 'ts-loader',
//         exclude: /node_modules/
//       }
//     ]
//   },
//   output: {
//     filename: 'siunitx.js',
//     path: path.resolve(__dirname, 'js'),
//     resolve: {
//       extensions: ['.ts', '.js']
//     }
//   }
// };