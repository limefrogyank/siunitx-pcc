import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options/options";
import { INumberPiece, parseNumber } from "./numMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import { createExponentMml, displayOutputMml } from "./numDisplayMethods";
import { ExponentsMode } from "./options/listOptions";
import { exponentListModeMap } from "./numlistMethods";
import { parseProductList } from "./numproductMethods";
import { displayUnits, parseUnit } from "./unitMethods";
import { createQuantityProductMml } from "./qtyMethods";
import { unitListModeMap } from "./qtylistMethods";


const listNumberMap = new Map<number, (nums:INumberPiece[], unitNodes: MmlNode[], parser: TexParser, options: IOptions)=>MmlNode[]>([
	[1, (nums: INumberPiece[], unitNodes: MmlNode[],parser: TexParser, options: IOptions) => {
        const nodes= displayOutputMml(nums[0], parser, options);
        return nodes.concat(unitNodes);
    }],  
	[3, (nums: INumberPiece[], unitNodes: MmlNode[], parser: TexParser, options: IOptions) => {
        const exponentMapItem = exponentListModeMap.get(options.listExponents);
        const exponentResult = exponentMapItem(nums, parser, options);

        const unitsMapItem = unitListModeMap.get(options.productUnits);
        const unitsResult = unitsMapItem(exponentResult, unitNodes, parser,options);

        let total = [];
        if (unitsResult.leading){
            total.push(unitsResult.leading);
        }
        //total = total.concat(displayOutputMml(exponentResult.numbers[0], parser, options));
        total = total.concat(unitsResult.numbers[0]);
        for (let i=1; i< nums.length; i++){
            const separator = (new TexParser(options.productMode === 'symbol' ? options.productSymbol : `\\text{${options.productPhrase}}`, parser.stack.env, parser.configuration)).mml();
            //const next = displayOutputMml(exponentResult.numbers[i], parser, options);
            total = total.concat(separator).concat(unitsResult.numbers[i]);
        }
        if (unitsResult.trailing){
            total = total.concat(unitsResult.trailing);
        }
        return total;
    }]
]);

export function processQuantityProduct(parser: TexParser): void {
	const globalOptions: IOptions = { ...parser.options as IOptions };

	const localOptions = findOptions(parser);

	Object.assign(globalOptions, localOptions);

	let text = parser.GetArgument('num');
    let unitString = parser.GetArgument('unit');
    const isLiteral = (unitString.indexOf('\\') == -1);
	const unitPieces = parseUnit(parser, unitString, globalOptions, localOptions, isLiteral);

	if (globalOptions.parseNumbers) {

		// going to assume evaluate expression is processed first, THEN the result is parsed normally
		if (globalOptions.evaluateExpression) {
			// TODO Sanitize Evaluate Expression!
			let expression = globalOptions.expression
			expression = expression.replace('#1', text);
			let result = eval(expression);
			text = result.toString();
		}

		const numlist = parseProductList(parser, text, globalOptions);
        if (globalOptions.productExponents === 'individual'){
            numlist.forEach(v=>{
                postProcessNumber(v, globalOptions);
            });
        } else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v,i)=>{
                if (i == 0){
                    postProcessNumber(v, globalOptions);
                } else {
                    postProcessNumber(v, altOptions);
                }
            });
        }

        // Need to process this after number because some options alter unit prefixes
        if (globalOptions.productUnits === 'power' || globalOptions.productUnits === 'bracket-power'){
            const multiplier = numlist.length;
            unitPieces.forEach(v=>{
                if (v.power){
                    v.power = v.power*multiplier;
                } else {
                    v.power = multiplier;
                }
            })
        }

        let unitDisplay = displayUnits(parser, unitPieces, globalOptions, isLiteral);
		const unitNodes = [(new TexParser(unitDisplay, parser.stack.env, parser.configuration)).mml()];
        const quantityProductNode = createQuantityProductMml(parser, globalOptions);
        if (quantityProductNode){
            unitNodes.splice(0,0,quantityProductNode);
        }
        
        
        const mapItem = listNumberMap.get(numlist.length) ?? listNumberMap.get(3);
        const mmlNodes = mapItem(numlist, unitNodes, parser, globalOptions);
        mmlNodes.forEach(v=>{
            parser.Push(v);
        });
		
	} else {
		const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
		//return [mml];
	}

}
