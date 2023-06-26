const PACKAGE = require('mathjax-full/components/webpack.common.js');

module.exports = PACKAGE(
  'siunitx',                                // the name of the package to build
  'node_modules/mathjax-full/js',    // location of the mathjax library
  [                                     // packages to link to
     'components/src/core/lib',
     'components/src/input/tex-base/lib'
  ],
  __dirname,                            // our directory
  '../.'                                   // where to put the packaged component,

);