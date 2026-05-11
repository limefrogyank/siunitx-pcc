import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { STATE } from '@mathjax/src/js/core/MathItem.js';
import { SerializedMmlVisitor } from '@mathjax/src/js/core/MmlTree/SerializedMmlVisitor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { mathjax } from '@mathjax/src/js/mathjax.js';

// TeX packages
import '@mathjax/src/js/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/js/input/tex/gensymb/GensymbConfiguration.js';
import '@mathjax/src/js/input/tex/color/ColorConfiguration.js';
import '@mathjax/src/js/input/tex/html/HtmlConfiguration.js';
import '@mathjax/src/js/input/tex/cancel/CancelConfiguration.js';
import '../ts/siunitx';

const adaptor = liteAdaptor();
const visitor = new SerializedMmlVisitor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({
  packages: [
    'base',
    'siunitx',
    'gensymb',
    'color',
    'html',
    'cancel'
  ],
});

const mmlDoc = mathjax.document('', {
  InputJax: tex,
});

export function texToMml(latex: string) {
  const mmlNode = mmlDoc.convert(latex, { end: STATE.CONVERT });
  return visitor.visitTree(mmlNode);
}
