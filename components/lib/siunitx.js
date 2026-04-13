import {combineWithMathJax} from '../../node_modules/@mathjax/src/mjs/components/global.js';
import {VERSION} from '../../node_modules/@mathjax/src/mjs/components/version.js';

import * as module1 from '../../js/siunitx.js';

if (MathJax.loader) {
  MathJax.loader.checkVersion('[siunitx]/sunitx', VERSION, 'tex-extension');
}

combineWithMathJax({_: {
  siunitx: module1
}});
