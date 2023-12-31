import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options/options";
import { parseNumber } from "./numMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { displayOutputMml } from "./numDisplayMethods";
import { exponentListModeMap } from "./numlistMethods";
import { displayUnits, parseUnit } from "./unitMethods";
import { createQuantityProductMml } from "./qtyMethods";
import { unitListModeMap } from "./qtylistMethods";

export function processQuantityRange(parser: TexParser): void {
	const globalOptions: IOptions = { ...parser.options as IOptions };

	const localOptions = findOptions(parser);

	Object.assign(globalOptions, localOptions);

	let first = parser.GetArgument('firstNum');
	let last = parser.GetArgument('lastNum');

    let unitString = parser.GetArgument('unit');
    const isLiteral = (unitString.indexOf('\\') == -1);
	const unitPieces = parseUnit(parser, unitString, globalOptions, localOptions, isLiteral);

	if (globalOptions.parseNumbers) {

		const firstNum = parseNumber(parser, first, globalOptions);
		const lastNum = parseNumber(parser, last, globalOptions);
        if (globalOptions.rangeExponents === 'individual'){
            postProcessNumber(firstNum, globalOptions);
            postProcessNumber(lastNum, globalOptions);
        } else {
            const targetExponent = firstNum.exponentSign + firstNum.exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            postProcessNumber(firstNum, globalOptions);
            postProcessNumber(lastNum, altOptions);
        }

        // Need to process this after number because some options alter unit prefixes
        let unitDisplay = displayUnits(parser, unitPieces, globalOptions, isLiteral);
		const unitNodes = [(new TexParser(unitDisplay, parser.stack.env, parser.configuration)).mml()];
        const quantityProductNode = createQuantityProductMml(parser, globalOptions);
        if (quantityProductNode){
            unitNodes.splice(0,0,quantityProductNode);
        }

        const exponentMapItem = exponentListModeMap.get(globalOptions.rangeExponents);
        const exponentResult = exponentMapItem([firstNum, lastNum], parser, globalOptions);
        const unitsMapItem = unitListModeMap.get(globalOptions.rangeUnits);
        const unitsResult = unitsMapItem(exponentResult, unitNodes, parser,globalOptions);
        
        const separator = (new TexParser(`\\text{${globalOptions.rangePhrase}}`, parser.stack.env, parser.configuration)).mml();
        
        let total = [];
        if (exponentResult.leading){
            total.push(exponentResult.leading);
        }
        total = total.concat(unitsResult.numbers[0]).concat(separator).concat(unitsResult.numbers[1]);
        if (exponentResult.trailing){
            total = total.concat(exponentResult.trailing);
        }
        
        total.forEach(v=>{
            parser.Push(v);
        });
		
	} else {
		const mml = (new TexParser(first + last, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
	}

}
