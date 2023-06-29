import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { siunitxError } from "./errors";
import { displayNumber } from "./numDisplayMethods";
import { CharNumFunction, generateNumberMapping, generateNumberPiece, INumberPiece } from "./numMethods";
import { findOptions, IAngleOptions, IOptions, processOptions } from "./options";

interface IAnglePiece {
	degrees: INumberPiece;
	minutes?: INumberPiece;
	seconds?: INumberPiece;
}

// Can't splat default otherwise references gets copied.  Need to construct it freshly.
export function generateAnglePiece():IAnglePiece{
	const ang :IAnglePiece = {
		degrees: generateNumberPiece()
	};
	return ang;
}

function parseAngle(parser:TexParser, text:string, options: IAngleOptions) : IAnglePiece {
	const ang : IAnglePiece = generateAnglePiece();
	let num : INumberPiece = ang.degrees;

	const mapping = generateNumberMapping(options);

	const subParser = new TexParser(text, parser.stack.env, parser.configuration);
	subParser.i=0;
	// process character
	// if '\', then read until next '\' or whitespace char
	while (subParser.i < subParser.string.length) {
		let char = subParser.string.charAt(subParser.i);
		subParser.i++;
		if (char != ';'){
			if (char != '\\'){
				if (mapping.has(char)){
					const func = mapping.get(char);
					if (typeof func == 'function'){
						(mapping.get(char) as CharNumFunction)(char, num);
					} else {
						if (num.whole =='' && num.decimal == ''){
							(func as Map<string,CharNumFunction>).get('inputSigns')(char, num);
						} else {
							(func as Map<string,CharNumFunction>).get('inputUncertaintySigns')(char, num);
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
							(func as Map<string,CharNumFunction>).get('inputSigns')(macro, num);
						} else {
							(func as Map<string,CharNumFunction>).get('inputUncertaintySigns')(macro, num);
						}
					}
				}
			}
		} else {
			if (ang.minutes == null){
				ang.minutes = generateNumberPiece();
				num = ang.minutes;
			} else if (ang.seconds == null){
				ang.seconds = generateNumberPiece();
				num = ang.seconds;
			} else {
				throw siunitxError.TooManySemicolonsInAngle;
			}
		}
		
	}
	return ang;
}

function convertToArc(ang:IAnglePiece):void{
	if (ang.minutes != null || ang.seconds != null){
		// already arc format
		return;
	}

	// This ignores exponents.
	if (ang.degrees.decimal != '') {
		const firstFraction = +('0.' + ang.degrees.fractional);
		ang.degrees.fractional = '';
		ang.degrees.decimal = '';
		if (firstFraction != 0){
			const minutes = firstFraction*60;
			ang.minutes = generateNumberPiece();
			ang.minutes.whole = Math.floor(minutes).toString();
			const splitMinutes = (minutes + '').split('.');
			if (splitMinutes.length > 1) {
				const seconds = +('.' + splitMinutes[1]) * 60;
				ang.seconds = generateNumberPiece();
				ang.seconds.whole = Math.floor(seconds).toString();
				const splitSeconds = (seconds + '').split('.');
				if (splitSeconds.length > 1){
					ang.seconds.decimal = '.';
					ang.seconds.fractional = splitSeconds[1];
				}
			}
		}
	}

}

function convertToDecimal(ang:IAnglePiece):void{
	let value = 0;
	if (ang.seconds != null){
		value = +ang.seconds.whole/60;
		ang.seconds = null;
	}
	if (ang.minutes != null){
		value = (+ang.minutes.whole + value)/60;
		ang.minutes = null;
	}
	
	value = (+ang.degrees.whole + value);
	const split = (value + '').split('.');
	ang.degrees.whole = split[0];
	if (split.length > 1){
		ang.degrees.decimal = '.';
		ang.degrees.fractional = split[1];
	}
}


const modeMapping = new Map<string, (ang:IAnglePiece)=>void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['input', (): void => { }], // do nothing
	['arc', convertToArc],
	['decimal', convertToDecimal] 
]);

function displayAngle(ang:IAnglePiece, options:IAngleOptions) : string {
	let displayResult = '';
	
	const degreeValue = +(ang.degrees.whole + (ang.degrees.decimal != '' ? '.' : '') + ang.degrees.fractional);
	if (degreeValue != 0 && !options.fillAngleDegrees){

		if (options.angleSymbolOverDecimal){
			const number = displayNumber(ang.degrees, options);
			const split= number.split(options.outputDecimalMarker);
			if (split.length > 1){
				displayResult += split[0];
				displayResult += '\\rlap{' + options.outputDecimalMarker +'}{' + options.angleSymbolDegree + '}';
				displayResult += split[1]; 
			} else {
				displayResult += number;
				displayResult += options.numberAngleProduct;
				displayResult += options.angleSymbolDegree;
			}
		} else {
			displayResult += displayNumber(ang.degrees, options);
			displayResult += options.numberAngleProduct;
			displayResult += options.angleSymbolDegree;
		}
	}

	if (displayResult != '' && options.angleSeparator != '') {
		displayResult += options.angleSeparator;
	}
	if (ang.minutes != null || options.fillAngleMinutes) {
		if (ang.minutes == null){
			ang.minutes = generateNumberPiece();
			ang.minutes.whole = '0';
		}
		const minutesValue = +(ang.minutes.whole + (ang.minutes.decimal != '' ? '.' : '') + ang.minutes.fractional);
		
		if (minutesValue != 0 && !options.fillAngleDegrees){

			if (options.angleSymbolOverDecimal){
				const number = displayNumber(ang.minutes, options);
				const split= number.split(options.outputDecimalMarker);
				if (split.length > 1){
					displayResult += split[0];
					displayResult += '\\rlap{' + options.outputDecimalMarker +'}{' + options.angleSymbolMinute + '}';
					displayResult += split[1]; 
				} else {
					displayResult += number;
					displayResult += options.numberAngleProduct;
					displayResult += options.angleSymbolMinute;
				}
			} else {
				displayResult += displayNumber(ang.minutes, options);
				displayResult += options.numberAngleProduct;
				displayResult += options.angleSymbolMinute;
			}
		}
	} 

	if (displayResult != '' && options.angleSeparator != '' && !displayResult.endsWith(options.angleSeparator)) {
		displayResult += options.angleSeparator;
	}
	if (ang.seconds != null || options.fillAngleMinutes) {
		if (ang.seconds == null){
			ang.seconds = generateNumberPiece();
			ang.seconds.whole = '0';
		}
		const secondsValue = +(ang.seconds.whole + (ang.seconds.decimal != '' ? '.' : '') + ang.seconds.fractional);
		
		if (secondsValue != 0 && !options.fillAngleDegrees){

			if (options.angleSymbolOverDecimal){
				const number = displayNumber(ang.seconds, options);
				const split= number.split(options.outputDecimalMarker);
				if (split.length > 1){
					displayResult += split[0];
					displayResult += '\\rlap{' + options.outputDecimalMarker +'}{' + options.angleSymbolSecond + '}';
					displayResult += split[1]; 
				} else {
					displayResult += number;
					displayResult += options.numberAngleProduct;
					displayResult += options.angleSymbolSecond;
				}
			} else {
				displayResult += displayNumber(ang.seconds, options);
				displayResult += options.numberAngleProduct;
				displayResult += options.angleSymbolSecond;
			}
		}
	} 

	return displayResult;
}


export function processAngle(parser:TexParser):MmlNode {

	const globalOptions : IOptions = {...parser.options as IOptions};

	const localOptionString = findOptions(parser);       

	processOptions(globalOptions, localOptionString);

	const text = parser.GetArgument('ang');

	processOptions(globalOptions, localOptionString);
	const ang = parseAngle(parser, text, globalOptions);

	// consider error checking result
	// Is there an exponent??  Maybe throw an error.
	
	// transform angle format
	modeMapping.get(globalOptions.angleMode)(ang);
	
	const displayResult = displayAngle(ang, globalOptions);

	const mml = (new TexParser(displayResult, parser.stack.env, parser.configuration)).mml();
    
	return mml;
}