// sort-imports-ignore
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { MathML } from '@mathjax/src/js/input/mathml.js';
import { mathjax } from '@mathjax/src/js/mathjax.js';
import { SVG } from '@mathjax/src/js/output/svg.js';

import { MathJaxNewcmFont } from '@mathjax/mathjax-newcm-font/js/svg.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const htmlDoc = mathjax.document('', {
  InputJax: new MathML(),
});

const NewcmFont = new MathJaxNewcmFont();
const svg = new SVG({ fontData: NewcmFont })

export function mmlToSvg(mml: string) {
  htmlDoc.outputJax = svg;
  htmlDoc.outputJax.setAdaptor(htmlDoc.adaptor);

  const htmlNode = htmlDoc.convert(mml);
  const svgNode = htmlNode.children[0];
  return adaptor.outerHTML(svgNode);
}
