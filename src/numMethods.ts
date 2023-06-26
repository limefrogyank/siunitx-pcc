import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import TexError from "mathjax-full/js/input/tex/TexError";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { displayOutput } from "./numDisplayMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { findOptions, INumOptions, INumParseOptions, IOptions, processOptions } from "./options";



export interface INumberPiece {
	prefix: string;
	sign: string;
	whole: string;
	decimal: string;
	fractional: string;
	exponentMarker: string;
	exponentSign: string;
	exponent: string;
	uncertainty: Array<IUncertainty>;
}

export interface IUncertainty extends INumberPiece  {
	type: 'bracket' | 'pm'
	completed: boolean; // mostly for uncertainty
}

export declare type CharNumFunction = (text:string, numPiece: INumberPiece) => void;

const NumberPieceDefault : INumberPiece = {
	prefix: '',
	sign: '',
	whole: '',
	decimal: '',
	fractional: '',
	exponentMarker: '',
	exponentSign: '',
	exponent: '',
	uncertainty: [] // this is temporary
};

const UncertaintyDefault: IUncertainty  = {
	...NumberPieceDefault,
	type: 'pm',
	completed: false
};

// Can't splat default otherwise array reference gets copied.  Need to construct it freshly.
export function generateNumberPiece():INumberPiece{
	const piece = {...NumberPieceDefault};
	piece.uncertainty = new Array<IUncertainty>();
	return piece;
}

function parseDigits(text:string, numPiece: INumberPiece){
	let num: INumberPiece;
	if (numPiece.uncertainty.length > 0){
		num = numPiece.uncertainty[numPiece.uncertainty.length-1];
	} else {
		num = numPiece;
	}
	if (num.exponentMarker != '') {
		num.exponent += text;
	} else if (num.decimal != '') {
		num.fractional += text;
	} else {
		num.whole += text;
	}
}

function parseDecimals(text: string, numPiece: INumberPiece){
	let num: INumberPiece;
	if (numPiece.uncertainty.length > 0){
		num = numPiece.uncertainty[numPiece.uncertainty.length-1];
	} else {
		num = numPiece;
	}
	num.decimal += text;
}

function parseComparators(text:string, numPiece: INumberPiece){
	let num: INumberPiece;
	if (numPiece.uncertainty.length > 0){
		num = numPiece.uncertainty[numPiece.uncertainty.length-1];
	} else {
		num = numPiece;
	}

	num.prefix += text;

}

function parseExponentMarkers(text:string, numPiece: INumberPiece){
	//let numPiece: INumberPiece;
	// if (numPiece.uncertainty.length > 0){
	// 	num = numPiece.uncertainty[numPiece.uncertainty.length-1];
	// } else {
	// 	num = numPiece;
	// }
	numPiece.exponentMarker += text;
}

function parseSigns(text:string, numPiece: INumberPiece){
	let num: INumberPiece;
	if (numPiece.uncertainty.length > 0){
		num = numPiece.uncertainty[numPiece.uncertainty.length-1];
	} else {
		num = numPiece;
	}
	if (num.exponentMarker != '') {
		num.exponentSign += text;
	} else {
		num.sign += text;
	}
}

function parseOpenUncertainty(text:string, numPiece: INumberPiece){
	const uncertainty : IUncertainty = {...UncertaintyDefault, type: 'bracket'};
	numPiece.uncertainty.push(uncertainty);
}

function parseCloseUncertainty(text:string, numPiece: INumberPiece){
	if (numPiece.uncertainty.length == 0){
		throw new TexError('50', 'No uncertainty parsed to close.');
	}
	const uncertainty = numPiece.uncertainty[numPiece.uncertainty.length -1];
	if (uncertainty.completed){
		throw new TexError('51', 'Uncertainty was already closed.');
	}
	uncertainty.completed = true;
}

function parseUncertaintySigns(text:string, numPiece: INumberPiece){
	const uncertainty:IUncertainty = {...UncertaintyDefault, type: 'pm'};
	numPiece.uncertainty.push(uncertainty);
}

function parseIgnore(){
	// do nothing
}

// using two types for output.  Ex.  \\pm is used both as sign and as an uncertainty.  Need map of map for this one.
export function generateNumberMapping(options: INumParseOptions): Map<string, CharNumFunction | Map<string,CharNumFunction>>{
	const parseMap = new Map<string,CharNumFunction | Map<string,CharNumFunction>>();
	//parseMap.set('\\', parseMacro);
	let tempArray;
	const matchMacrosOrChar = /[^\\\s]|(?:\\[^\\]*(?=\s|\\|$))/g;
	while ((tempArray = matchMacrosOrChar.exec(options.inputComparators)) !== null) {
		parseMap.set(tempArray[0], parseComparators);
	}
	while ((tempArray = matchMacrosOrChar.exec(options.inputSigns)) !== null) {
		parseMap.set(tempArray[0], parseSigns);
	}
	while ((tempArray = matchMacrosOrChar.exec(options.inputDigits)) !== null) {
		parseMap.set(tempArray[0], parseDigits);
	}
	while ((tempArray = matchMacrosOrChar.exec(options.inputDecimalMarkers)) !== null) {
		parseMap.set(tempArray[0], parseDecimals);
	}	
	while ((tempArray = matchMacrosOrChar.exec(options.inputOpenUncertainty)) !== null) {
		parseMap.set(tempArray[0], parseOpenUncertainty);
	}
	while ((tempArray = matchMacrosOrChar.exec(options.inputCloseUncertainty)) !== null) {
		parseMap.set(tempArray[0], parseCloseUncertainty);
	}
	while ((tempArray = matchMacrosOrChar.exec(options.inputUncertaintySigns)) !== null) {
		if (parseMap.has(tempArray[0])){
			const firstFunc = parseMap.get(tempArray[0]) as CharNumFunction;
			const innerMap = new Map<string, CharNumFunction>();
			innerMap.set('inputSigns', firstFunc);
			innerMap.set('inputUncertaintySigns', parseUncertaintySigns);
			parseMap.set(tempArray[0], innerMap);
		} else {
			parseMap.set(tempArray[0], parseUncertaintySigns);
		}
	}
	while ((tempArray = matchMacrosOrChar.exec(options.inputExponentMarkers)) !== null) {
		parseMap.set(tempArray[0], parseExponentMarkers);
	}
	while ((tempArray = matchMacrosOrChar.exec(options.inputIgnore)) !== null) {
		parseMap.set(tempArray[0], parseIgnore);
	}

	return parseMap;
}


export function parseNumber(parser:TexParser, text:string, options: INumOptions) : INumberPiece {
	
		const mapping = generateNumberMapping(options);
		text = text.replace('<<','\\ll');
		text = text.replace('>>','\\gg');
		text = text.replace('<=','\\le');
		text = text.replace('>=','\\ge');
		text = text.replace('+-','\\pm');

		const num : INumberPiece = generateNumberPiece();

		const subParser = new TexParser(text, parser.stack.env, parser.configuration);
		subParser.i=0;
		// process character
		// if '\', then read until next '\' or whitespace char
		while (subParser.i < subParser.string.length) {
			let char = subParser.string.charAt(subParser.i);
			subParser.i++;
			if (char != '\\'){
				if (mapping.has(char)){
					const func = mapping.get(char);
					if (typeof func == 'function'){
						(mapping.get(char) as CharNumFunction)(char, num);
					} else {
						if (num.whole =='' && num.decimal == ''){
							(func as Map<string,CharNumFunction>).get('inputSigns')?.(char, num);
						} else {
							(func as Map<string,CharNumFunction>).get('inputUncertaintySigns')?.(char, num);
						}
					}					
				}
			} else {
				let macro = char;
				char = '';
				while (subParser.i < subParser.string.length && char != '\\' && char != ' '){
					char = subParser.string.charAt(subParser.i);
					if (char != '\\' && char != ' '){
						macro += char;
					}
					subParser.i++;
				}

				if (mapping.has(macro)){
					const func = mapping.get(macro);
					if (typeof func == 'function'){
						(mapping.get(macro) as CharNumFunction)(macro, num);
					} else {
						if (num.whole =='' && num.decimal == ''){
							(func as Map<string,CharNumFunction>).get('inputSigns')?.(macro, num);
						} else {
							(func as Map<string,CharNumFunction>).get('inputUncertaintySigns')?.(macro, num);
						}
					}
				}
			}
			
		}

		if (!options.retainExplicitDecimalMarker && num.decimal != '' && num.fractional == ''){
			num.decimal = '';
		}
		if (!options.retainExplicitPlus && num.sign == '+'){
			num.sign = '';
		}
		const value = +(num.whole + (num.decimal != '' ? '.' : '') + num.fractional);
		if (value == 0 && !options.retainNegativeZero && num.sign == '-'){
			num.sign = '';
		}

		if (!options.retainZeroUncertainty){
			for (let i= num.uncertainty.length-1; i>=0; i--){
				const uncertaintyValue = +(num.uncertainty[i].whole + (num.uncertainty[i].decimal != '' ? '.' : '') + num.uncertainty[i].fractional);
				if (uncertaintyValue == 0){
					num.uncertainty.splice(i,1);
				}
			}
		}

		return num;
}

export function processNumber(parser:TexParser): MmlNode{
	const globalOptions : IOptions = {...parser.options as IOptions};

	const localOptionString = findOptions(parser);        

	processOptions(globalOptions, localOptionString);

	const text = parser.GetArgument('num');

	if (globalOptions.parseNumbers){

		// going to assume evaluate expression is processed first, THEN the result is parsed normally
		if (globalOptions.evaluateExpression){
			// TO-DO (BIG ONE)
		}

		const num = parseNumber(parser,text,globalOptions);

		postProcessNumber(num,globalOptions);

		const displayResult = displayOutput(num, globalOptions);

		const mml = (new TexParser(displayResult, parser.stack.env, parser.configuration)).mml();
		return mml;

	} else {
		const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
		return mml;
	}

}
