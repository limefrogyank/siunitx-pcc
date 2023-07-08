/*************************************************************
 *  Copyright (c) 2020 krautzource UG
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


import { Configuration } from 'mathjax-full/js/input/tex/Configuration';
import { ParseMethod } from 'mathjax-full/js/input/tex/Types';
import TexParser from 'mathjax-full/js/input/tex/TexParser';
import { CommandMap } from 'mathjax-full/js/input/tex/SymbolMap.js';
import { MmlNode } from 'mathjax-full/js/core/MmlTree/MmlNode.js';
import NodeUtil from 'mathjax-full/js/input/tex/NodeUtil.js';


/**
 * Parses the math argument of the above commands and returns it as single
 * node (in an mrow if necessary). The HTML attributes are then
 * attached to this element.
 * @param {TexParser} parser The calling parser.
 * @param {string} name The calling macro name.
 * @return {MmlNode} The math node.
 */
export let GetArgumentMML = function (parser: TexParser, name: string): MmlNode {
  let arg = parser.ParseArg(name);
  if (!NodeUtil.isInferred(arg)) {
    return arg;
  }
  let children = NodeUtil.getChildren(arg);
  if (children.length === 1) {
    return children[0];
  }
  const mrow = parser.create('node', 'mrow');
  NodeUtil.copyChildren(arg, mrow);
  NodeUtil.copyAttributes(arg, mrow);
  return mrow;
};


let ArialabelMethods: Record<string, ParseMethod> = {};

/**
 * Implements \arialabel{name}{math}
 * @param {TexParser} parser The calling parser.
 * @param {string} name The TeX string
 */
ArialabelMethods.Arialabel = function (parser: TexParser, name: string) {
  let thelabel = parser.GetArgument(name);
  const arg = GetArgumentMML(parser, name);
  NodeUtil.setAttribute(arg, 'aria-label', thelabel);
  parser.Push(arg);
};


new CommandMap('aria-label', {
   'arialabel': ['Arialabel'],
}, ArialabelMethods);



// export const configuration = Configuration.create(
//   'aria-label', {
//   handler: {
//     macro: ['aria-label']
//   }
// }
// );