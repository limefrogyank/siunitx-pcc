//const { paths } = require('mathjax-full/components/src/dependencies');
const { PACKAGE } = require('@mathjax/src/components/webpack.common.cjs');
//const PACKAGE = require('./webpackModded');




module.exports = PACKAGE({
  name: 'siunitx',                                // the name of the package to build
  js: 'node_modules/@mathjax/src/js',    // location of the mathjax library
  libs: [                                     // packages to link to
    'components/src/core/lib',
    'components/src/input/tex-base/lib'
  ],
  dir: __dirname + '/js',                            // our directory
  dist: '../.'                                   // where to put the packaged component,

});


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
