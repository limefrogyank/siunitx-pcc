import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options/options";
import { parseNumber } from "./numMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { exponentListModeMap } from "./numlistMethods";
import { displayUnits, parseUnit } from "./unitMethods";
import { createQuantityProductMml } from "./qtyMethods";
import { unitListModeMap } from "./qtylistMethods";

export function processQuantityRange(parser: TexParser): void {
	const globalOptions: IOptions = { ...parser.options.siunitx as IOptions };

	const localOptions = findOptions(parser, globalOptions);

	Object.assign(globalOptions, localOptions);

	const first = parser.GetArgument('firstNum');
	const last = parser.GetArgument('lastNum');

    const unitString = parser.GetArgument('unit');
    const isLiteral = (unitString.indexOf('\\') === -1);
	const unitPieces = parseUnit(parser, unitString, globalOptions, localOptions, isLiteral);

	if (globalOptions["parse-numbers"]) {

		const firstNum = parseNumber(parser, first, globalOptions);
		const lastNum = parseNumber(parser, last, globalOptions);
        if (globalOptions["range-exponents"] === 'individual'){
            postProcessNumber(firstNum, globalOptions);
            postProcessNumber(lastNum, globalOptions);
        } else {
            const targetExponent = firstNum.exponentSign + firstNum.exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            postProcessNumber(firstNum, globalOptions);
            postProcessNumber(lastNum, altOptions);
        }

        // Need to process this after number because some options alter unit prefixes
        const unitDisplay = displayUnits(parser, unitPieces, globalOptions, isLiteral);
		let unitNode = (new TexParser(unitDisplay, parser.stack.env, parser.configuration)).mml();
        const quantityProductNode = createQuantityProductMml(parser, globalOptions);
        if (quantityProductNode){
            const root = parser.create('node', 'inferredMrow', [], {});
            root.appendChild(quantityProductNode);
            root.appendChild(unitNode);
            unitNode = root; 
        }

        const exponentMapItem = exponentListModeMap.get(globalOptions["range-exponents"]);
        const exponentResult = exponentMapItem([firstNum, lastNum], parser, globalOptions);
        const unitsMapItem = unitListModeMap.get(globalOptions["range-units"]);
        const unitsResult = unitsMapItem(exponentResult, unitNode, parser,globalOptions);
        
        const separator = (new TexParser(`\\text{${globalOptions["range-phrase"]}}`, parser.stack.env, parser.configuration)).mml();

        const root = parser.create('node', 'inferredMrow', [], {});
        if (exponentResult.leading){
            root.appendChild(exponentResult.leading);
        }
        root.appendChild(unitsResult.numbers[0]);
        root.appendChild(separator);
        root.appendChild(unitsResult.numbers[1]);
        if (exponentResult.trailing){
            root.appendChild(exponentResult.trailing);
        }
        
        parser.Push(root);
		
	} else {
		const mml = (new TexParser(first + last, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
	}

}
