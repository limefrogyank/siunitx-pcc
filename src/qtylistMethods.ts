import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options/options";
import { INumberPiece } from "./numMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import { displayOutputMml } from "./numDisplayMethods";
import { UnitsModeProduct } from "./options/listOptions";
import { IExponentModeOutput, bracketCloseMap, bracketOpenMap, exponentListModeMap, parseList } from "./numlistMethods";
import { displayUnits, parseUnit } from "./unitMethods";
import { createQuantityProductMml } from "./qtyMethods";

interface IUnitsModeOutput {
    leading?: MmlNode;
    numbers: MmlNode[];
    trailing?: MmlNode;
}

function singleExponent(exponentResult: IExponentModeOutput, unitNode: MmlNode, parser:TexParser, options: IOptions):IUnitsModeOutput {
    const numNodes = exponentResult.numbers.map(v=>{
        const numNode = displayOutputMml(v, parser, options);
        return numNode;
    });
    if (exponentResult.trailing){
        exponentResult.trailing.appendChild(unitNode);
    } else {
        exponentResult.trailing = parser.create('node', 'inferredMrow', [], {});
        exponentResult.trailing.appendChild(unitNode);
    }
    return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
}

function bracketExponent(exponentResult: IExponentModeOutput, unitNode: MmlNode, parser:TexParser, options: IOptions): IUnitsModeOutput{
    const numNodes = exponentResult.numbers.map(v=>{
        const numNode = displayOutputMml(v, parser, options);
        return numNode;
    });

    if (exponentResult.leading === undefined){
        exponentResult.leading = parser.create('node', 'inferredMrow', [], {});
        const leadingBracket = (new TexParser(bracketOpenMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        exponentResult.leading.appendChild(leadingBracket);
    }

    if (exponentResult.trailing === undefined){
        exponentResult.trailing = parser.create('node', 'inferredMrow', [], {});
    }
    if (options["list-exponents"] !== 'combine-bracket'){
        const trailingBracket = (new TexParser(bracketCloseMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        if (options["list-exponents"] === 'individual'){
            //override collection of exponents by clearing them out
            exponentResult.trailing = parser.create('node', 'inferredMrow', [], {});
        }
        exponentResult.trailing.appendChild(trailingBracket);            
    }
    exponentResult.trailing.appendChild(unitNode);
   
    return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
}

export const unitListModeMap = new Map<UnitsModeProduct, (exponentResult: IExponentModeOutput, unitNode: MmlNode, parser:TexParser, options: IOptions)=>IUnitsModeOutput>([
    ['repeat', (exponentResult: IExponentModeOutput, unitNode: MmlNode, parser:TexParser, options: IOptions)=>{
        const numNodes = exponentResult.numbers.map(v=>{
            const root = parser.create('node', 'inferredMrow', [], {});
            const numNode = displayOutputMml(v, parser, options);
            root.appendChild(numNode);
            root.appendChild(unitNode);
            return root;
        });
        return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
    }],
    ['single', singleExponent],
    ['bracket', bracketExponent],
    ['power', singleExponent],
    ['bracket-power', bracketExponent]
]);

const listNumberMap = new Map<number, (nums:INumberPiece[], unitNode: MmlNode, parser: TexParser, options: IOptions)=>MmlNode>([
	[1, (nums: INumberPiece[],  unitNode: MmlNode, parser: TexParser, options: IOptions) => {
        const root = parser.create('node', 'inferredMrow', [], {});
        const numMml= displayOutputMml(nums[0], parser, options);
        root.appendChild(numMml);
        root.appendChild(unitNode);
        return root;
    }],  
	[2, (nums: INumberPiece[],  unitNode: MmlNode, parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options["list-exponents"]);
        const exponentResult = exponentMapItem(nums, parser, options);

        const unitsMapItem = unitListModeMap.get(options["list-units"]);
        const unitsResult = unitsMapItem(exponentResult, unitNode, parser,options);
        
        const root = parser.create('node', 'inferredMrow', [], {});
        if (unitsResult.leading){
            root.appendChild(unitsResult.leading);
        }

        root.appendChild(unitsResult.numbers[0]);
        const separator = (new TexParser(`\\text{${options["list-pair-separator"]}}`, parser.stack.env, parser.configuration)).mml();
        root.appendChild(separator);
        root.appendChild(unitsResult.numbers[1]);
        
        if (unitsResult.trailing){
            root.appendChild(unitsResult.trailing);
        }
        return root;
    }],
	[3, (nums: INumberPiece[], unitNode: MmlNode, parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options["list-units"] === 'single' ? 'individual' : options["list-exponents"]);
        const exponentResult = exponentMapItem(nums, parser, options);
        
        const unitsMapItem = unitListModeMap.get(options["list-units"]);
        const unitsResult = unitsMapItem(exponentResult, unitNode, parser,options);
        
        const root = parser.create('node', 'inferredMrow', [], {});
        if (unitsResult.leading){
            root.appendChild(unitsResult.leading);
        }
        
        root.appendChild(unitsResult.numbers[0]);

        const separator = (new TexParser(`\\text{${options["list-separator"]}}`, parser.stack.env, parser.configuration)).mml();
            for (let i=1; i< nums.length-1; i++){
            root.appendChild(separator);
            root.appendChild(unitsResult.numbers[i]);
        }

        const finalSeparator = (new TexParser(`\\text{${options["list-final-separator"]}}`, parser.stack.env, parser.configuration)).mml();
        root.appendChild(finalSeparator);
        root.appendChild(unitsResult.numbers[unitsResult.numbers.length-1]);

        if (unitsResult.trailing){
            root.appendChild(unitsResult.trailing);
        }
        return root;
    }]
]);


export function processQuantityList(parser: TexParser): void {
	const globalOptions: IOptions = { ...parser.options.siunitx as IOptions };

	const localOptions = findOptions(parser, globalOptions);

	Object.assign(globalOptions, localOptions);

	const text = parser.GetArgument('num');
	const unitString = parser.GetArgument('unit');
    const isLiteral = (unitString.indexOf('\\') === -1);
	const unitPieces = parseUnit(parser, unitString, globalOptions, localOptions, isLiteral);

	if (globalOptions["parse-numbers"]) {

		const numlist = parseList(parser, text, globalOptions);
		// // convert number and unit if necessary, use first number in list only
		// prefixModeMap.get(globalOptions.prefixMode)?.(numlist[0], unitPieces, globalOptions);

        // list-units=repeat requires list-exponents=individual, so override if necessary
        if (globalOptions["list-units"] === 'repeat'){
            globalOptions["list-exponents"] = 'individual';
        }        

        // seems both have to be set to have the list printed plainly, any changes in units display will affect exponents display and v.v.
        if (globalOptions["list-exponents"] === 'individual'){
            numlist.forEach(v=>{
                postProcessNumber(parser, v, globalOptions);
            });
        } else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v,i)=>{
                if (i === 0){
                    postProcessNumber(parser, v, globalOptions);
                } else {
                    postProcessNumber(parser, v, altOptions);
                }
            });
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
        
        const mapItem = listNumberMap.get(numlist.length) ?? listNumberMap.get(3);
        parser.Push(mapItem(numlist, unitNode, parser, globalOptions));
		
	} else {
		const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
		//return [mml];
	}

}
