import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options/options";
import { INumberPiece, parseNumber } from "./numMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import { createExponentMml, displayOutputMml } from "./numDisplayMethods";
import { ExponentsMode } from "./options/listOptions";

export interface IExponentModeOutput {
    leading?: MmlNode;
    numbers: INumberPiece[];
    trailing?: MmlNode[];
}

export const bracketOpenMap = new Map<string, (options: IOptions) => string>([
    ['\\numlist', (options: IOptions) => options.listOpenBracket],
    ['\\numproduct', (options: IOptions) => options.productOpenBracket],
    ['\\numrange', (options: IOptions) => options.rangeOpenBracket],
    ['\\qtylist', (options: IOptions) => options.listOpenBracket],
    ['\\qtyproduct', (options: IOptions) => options.productOpenBracket],
    ['\\qtyrange', (options: IOptions) => options.rangeOpenBracket],
]);

export const bracketCloseMap = new Map<string, (options: IOptions) => string>([
    ['\\numlist', (options: IOptions) => options.listCloseBracket],
    ['\\numproduct', (options: IOptions) => options.productCloseBracket],
    ['\\numrange', (options: IOptions) => options.rangeCloseBracket],
    ['\\qtylist', (options: IOptions) => options.listCloseBracket],
    ['\\qtyproduct', (options: IOptions) => options.productCloseBracket],
    ['\\qtyrange', (options: IOptions) => options.rangeCloseBracket],
]);

export const exponentListModeMap = new Map<ExponentsMode, (nums: INumberPiece[], parser: TexParser, options: IOptions) => IExponentModeOutput>([
    ['individual', (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        // do nothing
        return { numbers: nums };
    }],
    ['combine', (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        const exponentNodes = createExponentMml(nums[0], parser, options);
        nums.forEach(x => {
            x.exponent = '';
            x.exponentMarker = '';
            x.exponentSign = '';
        });
        return { numbers: nums, trailing: exponentNodes };
    }],
    ['combine-bracket', (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        const exponentNodes = createExponentMml(nums[0], parser, options);
        nums.forEach(x => {
            x.exponent = '';
            x.exponentMarker = '';
            x.exponentSign = '';
        });

        const leadingBracket = (new TexParser(bracketOpenMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        const trailingBracket = (new TexParser(bracketCloseMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        exponentNodes.splice(0, 0, trailingBracket);

        return { numbers: nums, trailing: exponentNodes, leading: leadingBracket };
    }]
]);

const listNumberMap = new Map<number, (nums: INumberPiece[], parser: TexParser, options: IOptions) => MmlNode[]>([
    [1, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        return displayOutputMml(nums[0], parser, options);
    }],
    [2, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options.listExponents);
        const exponentResult = exponentMapItem(nums, parser, options);
        const first = displayOutputMml(exponentResult.numbers[0], parser, options);
        const separator = (new TexParser(`\\text{${options.listPairSeparator}}`, parser.stack.env, parser.configuration)).mml();
        const second = displayOutputMml(exponentResult.numbers[1], parser, options);
        let total = [];
        if (exponentResult.leading) {
            total.push(exponentResult.leading);
        }
        total = total.concat(first).concat(separator).concat(second);
        if (exponentResult.trailing) {
            total = total.concat(exponentResult.trailing);
        }
        return total;
    }],
    [3, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options.listExponents);
        const exponentResult = exponentMapItem(nums, parser, options);
        let total = [];
        if (exponentResult.leading) {
            total.push(exponentResult.leading);
        }
        total = total.concat(displayOutputMml(exponentResult.numbers[0], parser, options));
        for (let i = 1; i < nums.length - 1; i++) {
            const separator = (new TexParser(`\\text{${options.listSeparator}}`, parser.stack.env, parser.configuration)).mml();
            const next = displayOutputMml(exponentResult.numbers[i], parser, options);
            total = total.concat(separator).concat(next);
        }

        const finalSeparator = (new TexParser(`\\text{${options.listFinalSeparator}}`, parser.stack.env, parser.configuration)).mml();
        const last = displayOutputMml(exponentResult.numbers[exponentResult.numbers.length - 1], parser, options);
        total = total.concat(finalSeparator).concat(last);
        if (exponentResult.trailing) {
            total = total.concat(exponentResult.trailing);
        }
        return total;
    }]
]);

export function parseList(parser: TexParser, input: string, options: IOptions): INumberPiece[] {
    const values = input.split(';');
    const nums = values.map(v => {
        return parseNumber(parser, v, options);
    });
    return nums;
}

export function processNumberList(parser: TexParser): void {
    const globalOptions: IOptions = { ...parser.options as IOptions };

    const localOptions = findOptions(parser);

    Object.assign(globalOptions, localOptions);

    let text = parser.GetArgument('num');

    if (globalOptions.parseNumbers) {

        // going to assume evaluate expression is processed first, THEN the result is parsed normally
        if (globalOptions.evaluateExpression) {
            // TODO Sanitize Evaluate Expression!
            let expression = globalOptions.expression
            expression = expression.replace('#1', text);
            let result = eval(expression);
            text = result.toString();
        }

        const numlist = parseList(parser, text, globalOptions);
        if (globalOptions.listExponents === 'individual') {
            numlist.forEach(v => {
                postProcessNumber(v, globalOptions);
            });
        } else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v, i) => {
                if (i == 0) {
                    postProcessNumber(v, globalOptions);
                } else {
                    postProcessNumber(v, altOptions);
                }
            });
        }

        const mapItem = listNumberMap.get(numlist.length) ?? listNumberMap.get(3);
        const mmlNodes = mapItem(numlist, parser, globalOptions);
        mmlNodes.forEach(v => {
            parser.Push(v);
        });

    } else {
        const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
        //return [mml];
    }

}
