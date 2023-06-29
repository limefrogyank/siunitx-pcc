import TexParser from "mathjax-full/js/input/tex/TexParser";
import { displayOutput } from "./numDisplayMethods";
import { INumberPiece, parseNumber } from "./numMethods";
import { convertToFixed, postProcessNumber } from "./numPostProcessMethods";
import { findOptions, IOptions, IQuantityOptions, PrefixMode, processOptions, SeparateUncertaintyUnits } from "./options";
import { displayUnits, IUnitPiece, parseUnit } from "./unitMethods";
import { prefixPower } from "./units";

function combineExponent(num: INumberPiece, units: IUnitPiece[], options: IQuantityOptions) : void {
	if (num.exponent == '' || (units == null || units.length == 0)){
		return;
	}

	const exponent = +(num.exponentSign + num.exponent);
	let targetExponent:number;
	for (const power of prefixPower.values()){
		if (power >= exponent){
			targetExponent = power;
		} else {
			break;
		}
	}

	const firstUnit = units[0];
	if (firstUnit.prefix != ''){
		const unitPower = (firstUnit.power != null ? +(firstUnit.power) : 1) * (firstUnit.position == 'denominator' ? -1 : 1);			
		const addedPower = firstUnit.prefix ? prefixPower.get(firstUnit.prefix) : 1;
		targetExponent += addedPower * unitPower;
		// just in case prefix was cm (2) and we added 3, there's no prefix for 5
		while (!prefixPower.revHas(targetExponent)) {
			targetExponent++;
		}
	}
	// set new prefix
	firstUnit.prefix = prefixPower.revGet(targetExponent);
	const newExponent = targetExponent - exponent;
	num.exponent = (Math.abs(newExponent)).toString();
	num.exponentSign = Math.sign(newExponent) > 0 ? '' : '-';
	convertToFixed(num, options);
}

function extractExponent(num: INumberPiece, units: IUnitPiece[], options: IQuantityOptions) : void {
	if (units == null){
		return;
	}

	let powersOfTen = 0;
	//let powersOfTwo = 0;

	for (let i= 0; i<units.length; i++) {
		const unit = units[i];
		if ((unit.prefix != '' && !options.extractMassInKilograms) || (unit.prefix != '' && options.extractMassInKilograms && unit.prefix != 'k' && unit.symbol != 'g')) {
			const unitPower = (unit.power != null ? +(unit.power) : 1) * (unit.position == 'denominator' ? -1 : 1);
			// if (binaryPrefixPower.has(unit.prefix)){
			// 	const prefPower = binaryPrefixPower.get(unit.prefix);
			// 	powersOfTwo += (prefPower*unitPower);
			// } else {
			if (prefixPower.has(unit.prefix)) {
				const prefPower = prefixPower.get(unit.prefix);
				powersOfTen += (prefPower*unitPower);
			} else {
				// Don't do anything to this prefix.  Can't convert it. Next unit...
				continue;
			}
			unit.prefix = '';
		}
	}
	const currentExponent = (num.exponent != '' ? +(num.exponentSign + num.exponent) : 0);
	const newExponent = currentExponent + powersOfTen;
	num.exponent = Math.abs(newExponent).toString();
	num.exponentSign = Math.sign(newExponent) > 0 ? '' : '-';
	if (num.exponentMarker == ''){
		num.exponentMarker = 'e';
	}
}

const prefixModeMap = new Map<PrefixMode, (num: INumberPiece, units: IUnitPiece[], options: IQuantityOptions)=>void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['input', ():void => { }],
	['combine-exponent', combineExponent],
	['extract-exponent', extractExponent]
]);

const separateUncertaintyUnitsMap = new Map<SeparateUncertaintyUnits, (num: string, units: string, options: IQuantityOptions)=>string>([
	['single', (num: string, units: string, options: IQuantityOptions ): string => {
		return num +  options.quantityProduct + units;
	}],
	['bracket', (num: string, units: string, options: IQuantityOptions ): string => {
		if (num.indexOf('\\pm') == -1){
			return num + options.quantityProduct + units;
		}
		return options.outputOpenUncertainty + num + options.outputCloseUncertainty + options.quantityProduct + units;
	}],
	['repeat', (num: string, units: string, options: IQuantityOptions ): string => {
		// split the num from the uncertainty, split on \\pm
		const split = num.split('\\pm');
		let separate = '';
		for (let i = 0; i < split.length; i++){
			if (separate != ''){
				separate += '\\pm';
			}
			separate += split[i];
			separate += options.quantityProduct;
			separate += units;
		}
		return separate;
	}]
]);

export function processQuantity(parser:TexParser): void {
	let globalOptions : IOptions = {...parser.options as IOptions};

	const localOptionString = findOptions(parser);        

	const numString = parser.GetArgument('num');
	const unitString = parser.GetArgument('unit');

	let numDisplay = '';
	let unitDisplay = '';

	const unitPieces = parseUnit(parser, unitString, globalOptions, localOptionString);	
	unitDisplay = displayUnits(parser, unitPieces, globalOptions);

	if (globalOptions.parseNumbers){

		// going to assume evaluate expression is processed first, THEN the result is parsed normally
		if (globalOptions.evaluateExpression){
			// TO-DO (BIG ONE)
		}

		// refresh global options from default
		globalOptions = {...parser.options as IOptions};	
		processOptions(globalOptions, localOptionString);
		const num = parseNumber(parser,numString,globalOptions);
		
		// convert number and unit if necessary
		prefixModeMap.get(globalOptions.prefixMode)?.(num, unitPieces, globalOptions);
				
		postProcessNumber(num,globalOptions);
		numDisplay = displayOutput(num, globalOptions);		

	} else {
		// can't do any conversions with number since processing is off
		numDisplay = numString;		
	}

	const qtyDisplay = separateUncertaintyUnitsMap.get(globalOptions.separateUncertaintyUnits)(numDisplay, unitDisplay, globalOptions);
	
	const qtyNode = (new TexParser(qtyDisplay, parser.stack.env, parser.configuration)).mml();	
	parser.Push(qtyNode);

}