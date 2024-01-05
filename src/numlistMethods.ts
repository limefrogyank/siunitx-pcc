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
    trailing?: MmlNode;
}

export const bracketOpenMap = new Map<string, (options: IOptions) => string>([
    ['\\numlist', (options: IOptions) => options["list-open-bracket"]],
    ['\\numproduct', (options: IOptions) => options["product-open-bracket"]],
    ['\\numrange', (options: IOptions) => options["range-open-bracket"]],
    ['\\qtylist', (options: IOptions) => options["list-open-bracket"]],
    ['\\qtyproduct', (options: IOptions) => options["product-open-bracket"]],
    ['\\qtyrange', (options: IOptions) => options["range-open-bracket"]],
]);

export const bracketCloseMap = new Map<string, (options: IOptions) => string>([
    ['\\numlist', (options: IOptions) => options["list-close-bracket"]],
    ['\\numproduct', (options: IOptions) => options["product-close-bracket"]],
    ['\\numrange', (options: IOptions) => options["range-close-bracket"]],
    ['\\qtylist', (options: IOptions) => options["list-close-bracket"]],
    ['\\qtyproduct', (options: IOptions) => options["product-close-bracket"]],
    ['\\qtyrange', (options: IOptions) => options["range-close-bracket"]],
]);

export const exponentListModeMap = new Map<ExponentsMode, (nums: INumberPiece[], parser: TexParser, options: IOptions) => IExponentModeOutput>([
    ['individual', (nums: INumberPiece[], _parser: TexParser, _options: IOptions) => {
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
        const exponentNode = createExponentMml(nums[0], parser, options);
        nums.forEach(x => {
            x.exponent = '';
            x.exponentMarker = '';
            x.exponentSign = '';
        });

        const leadingBracket = (new TexParser(bracketOpenMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        const trailingBracket = (new TexParser(bracketCloseMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        exponentNode.childNodes.splice(0, 0, trailingBracket);

        return { numbers: nums, trailing: exponentNode, leading: leadingBracket };
    }]
]);

const listNumberMap = new Map<number, (nums: INumberPiece[], parser: TexParser, options: IOptions) => MmlNode>([
    [1, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        return displayOutputMml(nums[0], parser, options);
    }],
    [2, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options["list-exponents"]);
        const exponentResult = exponentMapItem(nums, parser, options);
        const first = displayOutputMml(exponentResult.numbers[0], parser, options);
        const separator = (new TexParser(`\\text{${options["list-pair-separator"]}}`, parser.stack.env, parser.configuration)).mml();
        const second = displayOutputMml(exponentResult.numbers[1], parser, options);
        const root = parser.create('node', 'inferredMrow', [], {});
        if (exponentResult.leading) {
            root.appendChild(exponentResult.leading);
        }
        root.appendChild(first);
        root.appendChild(separator);
        root.appendChild(second);
        if (exponentResult.trailing) {
            root.appendChild(exponentResult.trailing);
        }
        return root;
    }],
    [3, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options["list-exponents"]);
        const exponentResult = exponentMapItem(nums, parser, options);
        const root = parser.create('node', 'inferredMrow', [], {});
        if (exponentResult.leading) {
            root.appendChild(exponentResult.leading);
        }
        root.appendChild(displayOutputMml(exponentResult.numbers[0], parser, options));
        for (let i = 1; i < nums.length - 1; i++) {
            const separator = (new TexParser(`\\text{${options["list-separator"]}}`, parser.stack.env, parser.configuration)).mml();
            const next = displayOutputMml(exponentResult.numbers[i], parser, options);
            root.appendChild(separator);
            root.appendChild(next);
        }

        const finalSeparator = (new TexParser(`\\text{${options["list-final-separator"]}}`, parser.stack.env, parser.configuration)).mml();
        const last = displayOutputMml(exponentResult.numbers[exponentResult.numbers.length - 1], parser, options);
        root.appendChild(finalSeparator);
        root.appendChild(last);
        if (exponentResult.trailing) {
            root.appendChild(exponentResult.trailing);
        }
        return root;
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
    const globalOptions: IOptions = { ...parser.options.siunitx as IOptions };

    const localOptions = findOptions(parser, globalOptions);

    Object.assign(globalOptions, localOptions);

    let text = parser.GetArgument('num');

    if (globalOptions["parse-numbers"]) {

        // going to assume evaluate expression is processed first, THEN the result is parsed normally
        if (globalOptions["evaluate-expression"]) {
            // TODO Sanitize Evaluate Expression!
            let expression = globalOptions.expression
            expression = expression.replace('#1', text);
            text = eval(expression).toString();
        }

        const numlist = parseList(parser, text, globalOptions);
        if (globalOptions["list-exponents"] === 'individual') {
            numlist.forEach(v => {
                postProcessNumber(v, globalOptions);
            });
        } else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v, i) => {
                if (i === 0) {
                    postProcessNumber(v, globalOptions);
                } else {
                    postProcessNumber(v, altOptions);
                }
            });
        }

        const mapItem = listNumberMap.get(numlist.length) ?? listNumberMap.get(3);
        const mmlNode = mapItem(numlist, parser, globalOptions);
        parser.Push(mmlNode);
        

    } else {
        const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
        //return [mml];
    }

}
