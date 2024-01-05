import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options/options";
import { INumberPiece, parseNumber } from "./numMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import { displayOutputMml } from "./numDisplayMethods";
import { exponentListModeMap } from "./numlistMethods";


const listNumberMap = new Map<number, (nums:INumberPiece[], parser: TexParser, options: IOptions)=>MmlNode[]>([
	[1, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        return displayOutputMml(nums[0], parser, options);
    }],  
	[3, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options["list-exponents"]);
        const exponentResult = exponentMapItem(nums, parser, options);
        let total = [];
        if (exponentResult.leading){
            total.push(exponentResult.leading);
        }
        total = total.concat(displayOutputMml(exponentResult.numbers[0], parser, options));
        for (let i=1; i< nums.length; i++){
            const separator = (new TexParser(options["product-mode"] === 'symbol' ? options["product-symbol"] : `\\text{${options["product-phrase"]}}`, parser.stack.env, parser.configuration)).mml();
            const next = displayOutputMml(exponentResult.numbers[i], parser, options);
            total = total.concat(separator).concat(next);
        }
        if (exponentResult.trailing){
            total = total.concat(exponentResult.trailing);
        }
        return total;
    }]
]);

export function parseProductList(parser:TexParser, input : string, options:IOptions): INumberPiece[] {
    const values = input.split('x');
    const nums = values.map(v=>{
        return parseNumber(parser, v.trim(), options);
    });
    return nums;
}

export function processNumberProduct(parser: TexParser): void {
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
			const result = eval(expression);
			text = result.toString();
		}

		const numlist = parseProductList(parser, text, globalOptions);
        if (globalOptions["product-exponents"] === 'individual'){
            numlist.forEach(v=>{
                postProcessNumber(v, globalOptions);
            });
        } else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v,i)=>{
                if (i === 0){
                    postProcessNumber(v, globalOptions);
                } else {
                    postProcessNumber(v, altOptions);
                }
            });
        }
        
        const mapItem = listNumberMap.get(numlist.length) ?? listNumberMap.get(3);
        const mmlNodes = mapItem(numlist, parser, globalOptions);
        mmlNodes.forEach(v=>{
            parser.Push(v);
        });
		
	} else {
		const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
		//return [mml];
	}

}
