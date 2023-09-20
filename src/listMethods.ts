import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options/options";
import { INumberPiece, parseNumber } from "./numMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import { displayOutputMml } from "./numDisplayMethods";

const listNumberMap = new Map<number, (nums:INumberPiece[], parser: TexParser, options: IOptions)=>MmlNode[]>([
	[1, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        return displayOutputMml(nums[0], parser, options);
    }],  
	[2, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        const first = displayOutputMml(nums[0], parser, options);
        const separator = (new TexParser(`\\text{${options.listPairSeparator}}`, parser.stack.env, parser.configuration)).mml();
        const second = displayOutputMml(nums[1], parser, options);
        const total = first.concat(separator).concat(second);
        return total;
    }],
	[3, (nums: INumberPiece[], parser: TexParser, options: IOptions) => {
        let total = displayOutputMml(nums[0], parser, options);
        for (let i=1; i< nums.length-1; i++){
            const separator = (new TexParser(`\\text{${options.listSeparator}}`, parser.stack.env, parser.configuration)).mml();
            const next = displayOutputMml(nums[1], parser, options);
            total = total.concat(separator).concat(next);
        }

        const finalSeparator = (new TexParser(`\\text{${options.listFinalSeparator}}`, parser.stack.env, parser.configuration)).mml();
        const last = displayOutputMml(nums[nums.length-1], parser, options);
        total = total.concat(finalSeparator).concat(last);
        
        return total;
    }]
]);

function parseList(parser:TexParser, input : string, options:IOptions): INumberPiece[] {
    const values = input.split(';');
    const nums = values.map(v=>{
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
        numlist.forEach(v=>{
            postProcessNumber(v, globalOptions);
        });
        
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
