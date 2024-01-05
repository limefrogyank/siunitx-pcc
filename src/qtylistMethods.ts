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
    numbers: MmlNode[][];
    trailing?: MmlNode[];
}

function singleExponent(exponentResult: IExponentModeOutput, unitNodes: MmlNode[], parser:TexParser, options: IOptions):IUnitsModeOutput {
    const numNodes = exponentResult.numbers.map(v=>{
        const numNode = displayOutputMml(v, parser, options);
        return numNode;
    });
    if (exponentResult.trailing){
        exponentResult.trailing = exponentResult.trailing.concat(unitNodes);
    } else {
        exponentResult.trailing = [];
        exponentResult.trailing = exponentResult.trailing.concat(unitNodes);
    }
    return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
}

function bracketExponent(exponentResult: IExponentModeOutput, unitNodes: MmlNode[], parser:TexParser, options: IOptions): IUnitsModeOutput{
    const numNodes = exponentResult.numbers.map(v=>{
        const numNode = displayOutputMml(v, parser, options);
        return numNode;
    });

    if (exponentResult.leading === undefined){
        const leadingBracket = (new TexParser(bracketOpenMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        exponentResult.leading = leadingBracket;
    }

    if (options["list-exponents"] !== 'combine-bracket'){
        const trailingBracket = (new TexParser(bracketCloseMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        if (options["list-exponents"] === 'individual'){
            exponentResult.trailing = [];
        }
        exponentResult.trailing.push(trailingBracket);            
    }
    exponentResult.trailing = exponentResult.trailing.concat(unitNodes);
   
    return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
}

export const unitListModeMap = new Map<UnitsModeProduct, (exponentResult: IExponentModeOutput, unitNodes: MmlNode[], parser:TexParser, options: IOptions)=>IUnitsModeOutput>([
    ['repeat', (exponentResult: IExponentModeOutput, unitNodes: MmlNode[], parser:TexParser, options: IOptions)=>{
        const numNodes = exponentResult.numbers.map(v=>{
            const numNode = displayOutputMml(v, parser, options);
            return numNode.concat(unitNodes);
        });
        return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
    }],
    ['single', singleExponent],
    ['bracket', bracketExponent],
    ['power', singleExponent],
    ['bracket-power', bracketExponent]
]);

const listNumberMap = new Map<number, (nums:INumberPiece[], unitNodes: MmlNode[], parser: TexParser, options: IOptions)=>MmlNode[]>([
	[1, (nums: INumberPiece[],  unitNodes: MmlNode[], parser: TexParser, options: IOptions) => {
        const numMml= displayOutputMml(nums[0], parser, options);
        numMml.concat(unitNodes);
        return numMml;
    }],  
	[2, (nums: INumberPiece[],  unitNodes: MmlNode[], parser: TexParser, options: IOptions) => {
        
        const exponentMapItem = exponentListModeMap.get(options["list-exponents"]);
        const exponentResult = exponentMapItem(nums, parser, options);

        const unitsMapItem = unitListModeMap.get(options["list-units"]);
        const unitsResult = unitsMapItem(exponentResult, unitNodes, parser,options);
        
        let total = [];
        if (unitsResult.leading){
            total.push(unitsResult.leading);
        }
        //const first = displayOutputMml(exponentResult.numbers[0], parser, options);
        total = total.concat(unitsResult[0]);
        // if (options.listUnits === 'single'){
        //     total.push(unitNode);
        // }
        const separator = (new TexParser(`\\text{${options["list-pair-separator"]}}`, parser.stack.env, parser.configuration)).mml();
        total = total.concat(separator);
        //const second = displayOutputMml(exponentResult.numbers[1], parser, options);
        total = total.concat(unitsResult[1]);
        // if (options.listUnits === 'single'){
        //     total.push(unitNode);
        // }
        

        if (unitsResult.trailing){
            total = total.concat(unitsResult.trailing);
        }
        return total;
    }],
	[3, (nums: INumberPiece[], unitNodes: MmlNode[], parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options["list-units"] === 'single' ? 'individual' : options["list-exponents"]);
        const exponentResult = exponentMapItem(nums, parser, options);
        
        const unitsMapItem = unitListModeMap.get(options["list-units"]);
        const unitsResult = unitsMapItem(exponentResult, unitNodes, parser,options);
        
        let total = [];
        if (unitsResult.leading){
            total.push(unitsResult.leading);
        }
        // total = total.concat(displayOutputMml(exponentResult.numbers[0], parser, options));
        total = total.concat(unitsResult.numbers[0]);
        // if (options.listUnits === 'repeat'){
        //     total.push(unitNode);
        // }
        for (let i=1; i< nums.length-1; i++){
            const separator = (new TexParser(`\\text{${options["list-separator"]}}`, parser.stack.env, parser.configuration)).mml();
            //const next = displayOutputMml(exponentResult.numbers[i], parser, options);
            total = total.concat(separator).concat(unitsResult.numbers[i]);
            // if (options.listUnits === 'repeat'){
            //     total.push(unitNode);
            // }    
        }

        const finalSeparator = (new TexParser(`\\text{${options["list-final-separator"]}}`, parser.stack.env, parser.configuration)).mml();
        //const last = displayOutputMml(exponentResult.numbers[exponentResult.numbers.length-1], parser, options);
        total = total.concat(finalSeparator).concat(unitsResult.numbers[unitsResult.numbers.length-1]);
        // if (options.listUnits === 'repeat'){
        //     total.push(unitNode);
        // }
        if (unitsResult.trailing){
            total = total.concat(unitsResult.trailing);
        }
        return total;
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

        // Need to process this after number because some options alter unit prefixes
        const unitDisplay = displayUnits(parser, unitPieces, globalOptions, isLiteral);
        const unitNode = [(new TexParser(unitDisplay, parser.stack.env, parser.configuration)).mml()];
        const quantityProductNode = createQuantityProductMml(parser, globalOptions);
        if (quantityProductNode){
            unitNode.splice(0,0,quantityProductNode);
        }
        
        const mapItem = listNumberMap.get(numlist.length) ?? listNumberMap.get(3);
        const mmlNodes = mapItem(numlist, unitNode, parser, globalOptions);
        mmlNodes.forEach(v=>{
            parser.Push(v);
        });
		
	} else {
		const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
		//return [mml];
	}

}
