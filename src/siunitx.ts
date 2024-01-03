import { TeX } from 'mathjax-full/js/input/tex';
import { Configuration, ParserConfiguration } from 'mathjax-full/js/input/tex/Configuration';
import { CommandMap, CharacterMap } from 'mathjax-full/js/input/tex/SymbolMap';
import TexParser from 'mathjax-full/js/input/tex/TexParser';
import { processAngle } from './angMethods';
import { processNumber } from './numMethods';
import { findOptions, IOptions, processSISetup, siunitxDefaults, } from './options/options';
import { processQuantity } from './qtyMethods';
import { processUnit } from './unitMethods';
import { userDefinedUnitOptions, userDefinedUnits } from './units';
import { GetArgumentMML } from "./aria-label";
import NodeUtil from 'mathjax-full/js/input/tex/NodeUtil';

import { Symbol as TexSymbol } from 'mathjax-full/js/input/tex/Symbol'
import { TexConstant } from 'mathjax-full/js/input/tex/TexConstants';
import { processComplexNumber, processComplexQuantity } from './complexMethods';
import { processNumberList } from './numlistMethods';
import { processNumberProduct } from './numproductMethods';
import { processNumberRange } from './numrangeMethods';
import { processQuantityList } from './qtylistMethods';
import { processQuantityRange } from './qtyrangeMethods';
import { processQuantityProduct } from './qtyproductMethods';

const methodMap: Record<string, (parser: TexParser) => void> = {
    '\\num': (parser: TexParser): void => {
        processNumber(parser).forEach(v => parser.Push(v));
    },
    '\\ang': (parser: TexParser): void => {
        parser.Push(processAngle(parser));
    },
    '\\unit': (parser: TexParser): void => {
        parser.Push(processUnit(parser));
    },
    '\\qty': (parser: TexParser): void => {
        processQuantity(parser); // doesn't return a node, pushes internally
    },
    '\\numlist': (parser: TexParser): void => {
        processNumberList(parser);
    },
    '\\qtylist': (parser: TexParser): void => {
        processQuantityList(parser);
    },
    '\\numproduct': (parser: TexParser): void => {
        processNumberProduct(parser);
    },
    '\\qtyproduct': (parser: TexParser): void => {
        processQuantityProduct(parser);
    },
    '\\numrange': (parser: TexParser): void => {
        processNumberRange(parser);
    },
    '\\qtyrange': (parser: TexParser): void => {
        processQuantityRange(parser);
    },
    '\\complexnum': (parser: TexParser): void => {
        processComplexNumber(parser).forEach(v => parser.Push(v));
    },
    '\\complexqty': (parser: TexParser): void => {
        processComplexQuantity(parser);
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    '@{}S': (parser: TexParser): void => {
        //TODO: NOT IMPLEMENTED
        // no tabular in MathJax, but maybe use \\begin{array} ?  or pure html somehow
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    '\\tablenum': (parser: TexParser): void => {
        //TODO: NOT IMPLEMENTED
    },
    '\\sisetup': (parser: TexParser): void => {
        processSISetup(parser);
    }
};

const declareMap: Record<string, (parser: TexParser, name: string, options: Partial<IOptions>) => void> = {
    '\\DeclareSIUnit': (parser: TexParser, name: string, options: Partial<IOptions>): void => {
        const userDefinedUnits = parser.configuration.packageData.get(UserDefinedUnitsKey) as Map<string, string>;
        const userDefinedUnitOptions = parser.configuration.packageData.get(UserDefinedUnitOptionsKey) as Map<string, Partial<IOptions>>;

        const newUnitMacro = parser.GetArgument(name);
        const newSymbol = parser.GetArgument(name);

        userDefinedUnits.set(newUnitMacro, newSymbol);
        if (options !== undefined) {
            userDefinedUnitOptions.set(newUnitMacro, options);
        }
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    '\\DeclareSIQualifier': (parser: TexParser, name: string, options: Partial<IOptions>): void => {
        //TODO: DeclareSIQualifier (eg g_{salt} for "grams of salt")
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    '\\DeclareSIPower': (parser: TexParser, name: string, options: Partial<IOptions>): void => {
        //TODO: DeclareSIPower  (eg \square,\cubic,\squared,\cubed)
    },
};

export let GlobalParser: TexParser;

export const UserDefinedUnitsKey = 'siunitxUnits';
export const UserDefinedUnitOptionsKey = 'siunitxUnitOptions';

function angleChars(parser: TexParser, mchar: TexSymbol) {
    const def = mchar.attributes || {};
    def.mathvariant = TexConstant.Variant.NORMAL;
    def.class = 'MathML-Unit';
    const emptyToken = parser.create('token', 'mi', { 'data-semantic-type': 'empty' });
    const symbolToken = parser.create('token', 'mi', def, mchar.char);
    const msupNode = parser.create('node', 'msup', [emptyToken, symbolToken]);
    parser.Push(msupNode);
}

new CharacterMap('angchar-symbols', angleChars, {
    degreeminute: ['\u2032', {}],
    degreesecond: ['\u2033', {}]
});


new CommandMap('siunitxMap', {
    num: ['siunitxToken', 'num'],
    ang: ['siunitxToken', 'ang'],
    complexnum: ['siunitxToken', 'complexnum'],
    unit: ['siunitxToken', 'unit'],
    qty: ['siunitxToken', 'qty'],
    complexqty: ['siunitxToken', 'complexqty'],
    numlist: ['siunitxToken', 'numlist'],
    numproduct: ['siunitxToken', 'numproduct'],
    numrange: ['siunitxToken', 'numrange'],
    qtylist: ['siunitxToken', 'qtylist'],
    qtyrange: ['siunitxToken', 'qtyrange'],
    qtyproduct: ['siunitxToken', 'qtyproduct'],
    DeclareSIUnit: ['siunitxGlobal', 'DeclareSIUnit'],
    sisetup: ['siunitxToken', 'sisetup'],
    arialabel: ['Arialabel', 'arialabel'],
    data: ['Dataset', 'data'],
}, {
    siunitxToken: (parser, name) => {
        GlobalParser = parser;
        methodMap[name as string]?.(parser);
    },
    siunitxGlobal: (parser, name) => {
        GlobalParser = parser;
        const options = findOptions(parser);
        declareMap[name as string]?.(parser, name as string, options);
    },
    Arialabel: (parser: TexParser, name: string) => {
        const thelabel = parser.GetArgument(name);
        const arg = GetArgumentMML(parser, name);
        NodeUtil.setAttribute(arg, 'aria-label', thelabel);
        parser.Push(arg);
    },
    // currently not used
    Dataset: (parser: TexParser, name: string) => {
        const dataset = parser.GetArgument(name);
        const arg = GetArgumentMML(parser, name);
        //parse dataset to get both sides of equal
        const pair = dataset.split('=');
        NodeUtil.setAttribute(arg, 'data-' + pair[0], pair[1]);
        parser.Push(arg);
    }
});

//TODO: Consider memoization. If input is the same, may as well return the same value without processing.  
// Could even split up memoization for \num between parse, post-process, and print.  The options are split 
// that way, too, so comparing options should be relatively simple.



// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config = (_config: ParserConfiguration, jax: TeX<any, any, any>) => {
    jax.parseOptions.packageData.set(UserDefinedUnitsKey, userDefinedUnits);
    jax.parseOptions.packageData.set(UserDefinedUnitOptionsKey, userDefinedUnitOptions);
};


Configuration.create('siunitx',
    {
        handler: {
            macro: ['angchar-symbols', 'siunitxMap']
        },
        options: siunitxDefaults,
        config: config
    });
