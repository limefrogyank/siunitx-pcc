import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { siunitxError } from "./errors";
import { displayNumber } from "./numDisplayMethods";
import { CharNumFunction, generateNumberMapping, generateNumberPiece, INumberPiece } from "./numMethods";
import { findOptions, IOptions } from "./options/options";
import { IAngleOptions } from "./options/angleOptions";

interface IAnglePiece {
	degrees: INumberPiece;
	minutes?: INumberPiece;
	seconds?: INumberPiece;
}

// Can't splat default otherwise references gets copied.  Need to construct it freshly.
export function generateAnglePiece(): IAnglePiece {
	const ang: IAnglePiece = {
		degrees: generateNumberPiece()
	};
	return ang;
}

function parseAngle(parser: TexParser, text: string, options: IAngleOptions): IAnglePiece {
	const ang: IAnglePiece = generateAnglePiece();
	let num: INumberPiece = ang.degrees;

	const mapping = generateNumberMapping(options);

	const subParser = new TexParser(text, parser.stack.env, parser.configuration);
	subParser.i = 0;
	// process character
	// if '\', then read until next '\' or whitespace char
	while (subParser.i < subParser.string.length) {
		let char = subParser.string.charAt(subParser.i);
		subParser.i++;
		if (char != ';') {
			if (char != '\\') {
				if (mapping.has(char)) {
					const func = mapping.get(char);
					if (typeof func == 'function') {
						(mapping.get(char) as CharNumFunction)(char, num);
					} else {
						if (num.whole == '' && num.decimal == '') {
							(func as Map<string, CharNumFunction>).get('inputSigns')(char, num);
						} else {
							(func as Map<string, CharNumFunction>).get('inputUncertaintySigns')(char, num);
						}
					}
				}
			} else {
				let macro = char;
				char = '';
				while (subParser.i < subParser.string.length && char != '\\' && char != ' ') {
					char = subParser.string.charAt(subParser.i);
					if (char != '\\' && char != ' ') {
						macro += char;
					}
					subParser.i++;
				}

				if (mapping.has(macro)) {
					const func = mapping.get(macro);
					if (typeof func == 'function') {
						(mapping.get(macro) as CharNumFunction)(macro, num);
					} else {
						if (num.whole == '' && num.decimal == '') {
							(func as Map<string, CharNumFunction>).get('inputSigns')(macro, num);
						} else {
							(func as Map<string, CharNumFunction>).get('inputUncertaintySigns')(macro, num);
						}
					}
				}
			}
		} else {
			if (ang.minutes == null) {
				ang.minutes = generateNumberPiece();
				num = ang.minutes;
			} else if (ang.seconds == null) {
				ang.seconds = generateNumberPiece();
				num = ang.seconds;
			} else {
				throw siunitxError.TooManySemicolonsInAngle;
			}
		}

	}

	// copied directly from parseNumber, this can be applied to degrees only most likely?
	// TODO: This duplicates some code... clean up?

	if (!options.retainExplicitDecimalMarker && ang.degrees.decimal != '' && ang.degrees.fractional == '') {
		ang.degrees.decimal = '';
	}
	if (!options.retainExplicitPlus && ang.degrees.sign == '+') {
		ang.degrees.sign = '';
	}
	const value = +(ang.degrees.whole + (ang.degrees.decimal != '' ? '.' : '') + ang.degrees.fractional);
	if (value == 0 && !options.retainNegativeZero && ang.degrees.sign == '-') {
		ang.degrees.sign = '';
	}

	return ang;
}

function convertToArc(ang: IAnglePiece): void {
	if (ang.minutes != null || ang.seconds != null) {
		// already arc format
		return;
	}

	// This ignores exponents.
	if (ang.degrees.decimal != '') {
		const firstFraction = +('0.' + ang.degrees.fractional);
		ang.degrees.fractional = '';
		ang.degrees.decimal = '';
		if (firstFraction != 0) {
			const minutes = firstFraction * 60;
			ang.minutes = generateNumberPiece();
			ang.minutes.whole = Math.floor(minutes).toString();
			const splitMinutes = (minutes + '').split('.');
			if (splitMinutes.length > 1) {
				const seconds = +('.' + splitMinutes[1]) * 60;
				ang.seconds = generateNumberPiece();
				ang.seconds.whole = Math.floor(seconds).toString();
				const splitSeconds = (seconds + '').split('.');
				if (splitSeconds.length > 1) {
					ang.seconds.decimal = '.';
					ang.seconds.fractional = splitSeconds[1];
				}
			}
		}
	}

}

function convertToDecimal(ang: IAnglePiece): void {
	let value = 0;
	if (ang.seconds != null) {
		value = +ang.seconds.whole / 60;
		ang.seconds = null;
	}
	if (ang.minutes != null) {
		value = (+ang.minutes.whole + value) / 60;
		ang.minutes = null;
	}

	value = (+ang.degrees.whole + value);
	const split = (value + '').split('.');
	ang.degrees.whole = split[0];
	if (split.length > 1) {
		ang.degrees.decimal = '.';
		ang.degrees.fractional = split[1];
	}
}


const modeMapping = new Map<string, (ang: IAnglePiece) => void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['input', (): void => { }], // do nothing
	['arc', convertToArc],
	['decimal', convertToDecimal]
]);

function displayAngle(ang: IAnglePiece, options: IAngleOptions): string {
	let displayResult = '';
	const degreeValue = +(ang.degrees.whole + (ang.degrees.decimal != '' ? '.' : '') + ang.degrees.fractional);
	if (ang.degrees.whole == '' && options.fillAngleDegrees) {
		if (ang.minutes.sign == '-') {
			ang.degrees.sign = '-';
			ang.minutes.sign = '';
		} else if (ang.seconds.sign == '-') {
			ang.degrees.sign = '-';
			ang.seconds.sign = '';
		}
		ang.degrees.whole = '0';
	}
	if (degreeValue != 0 || ang.degrees.whole == '0' || options.fillAngleDegrees) {
		if (options.angleSymbolOverDecimal) {
			const number = displayNumber(ang.degrees, options);
			const split = number.split(options.outputDecimalMarker);
			if (split.length > 1) {
				displayResult += split[0];
				displayResult += '\\rlap{' + options.outputDecimalMarker + '}{\\class{MathML-Unit}{\\mathrm{' + options.angleSymbolDegree + '}}}';
				displayResult += split[1];
			} else {
				displayResult += number;
				displayResult += options.numberAngleProduct;
				displayResult += '\\class{MathML-Unit}{\\mathrm{' + options.angleSymbolDegree + '}}';
			}
		} else {

			displayResult += displayNumber(ang.degrees, options);
			displayResult += options.numberAngleProduct;
			displayResult += '\\mathrm{' + options.angleSymbolDegree + '}';
		}
	}


	if (displayResult != '' && options.angleSeparator != '') {
		displayResult += options.angleSeparator;
	}

	if (ang.minutes != null) {
		const minutesValue = +(ang.minutes.whole + (ang.minutes.decimal != '' ? '.' : '') + ang.minutes.fractional);
		let moddedAngleSymbolMinute = '\\mathrm{' + options.angleSymbolMinute + '}';
		if (moddedAngleSymbolMinute === "\\mathrm{'}") {
			// TODO: Localize the degree-minutes
			if (minutesValue == 1)
				moddedAngleSymbolMinute = '\\arialabel{degree-minute}{\\degreeminute}';
			else
				moddedAngleSymbolMinute = '\\arialabel{degree-minutes}{\\degreeminute}';
		}
		if (minutesValue != 0 || ang.minutes.whole == '0' || options.fillAngleMinutes) {

			if (minutesValue == 0 && options.fillAngleMinutes) {
				if (ang.seconds.sign == '-') {
					ang.minutes.sign = '-';
					ang.seconds.sign = '';
				}
				ang.minutes.whole = '0';
			}

			if (options.angleSymbolOverDecimal) {
				const number = displayNumber(ang.minutes, options);
				const split = number.split(options.outputDecimalMarker);
				if (split.length > 1) {
					displayResult += split[0];
					displayResult += '\\rlap{' + options.outputDecimalMarker + '}{' + moddedAngleSymbolMinute + '}';
					displayResult += split[1];
				} else {
					displayResult += number;
					displayResult += options.numberAngleProduct;
					displayResult += moddedAngleSymbolMinute;
				}
			} else {
				displayResult += displayNumber(ang.minutes, options);
				displayResult += options.numberAngleProduct;
				displayResult += moddedAngleSymbolMinute;
			}
		}
	}

	if (displayResult != '' && options.angleSeparator != '' && !displayResult.endsWith(options.angleSeparator)) {
		displayResult += options.angleSeparator;
	}
	if (ang.seconds != null) {
		const secondsValue = +(ang.seconds.whole + (ang.seconds.decimal != '' ? '.' : '') + ang.seconds.fractional);
		let moddedAngleSymbolSecond = '\\mathrm{' + options.angleSymbolSecond + '}';
		if (moddedAngleSymbolSecond === "\\mathrm{''}") {
			// TODO: Localize the degree-seconds
			if (secondsValue == 1)
				moddedAngleSymbolSecond = '\\arialabel{degree-second}{\\degreesecond}';
			else
				moddedAngleSymbolSecond = '\\arialabel{degree-seconds}{\\degreesecond}';
		}
		if (secondsValue != 0 || ang.seconds.whole == '0' || options.fillAngleSeconds) {

			if (secondsValue == 0 && options.fillAngleSeconds) {
				ang.seconds.whole = '0';
			}

			if (options.angleSymbolOverDecimal) {
				const number = displayNumber(ang.seconds, options);
				const split = number.split(options.outputDecimalMarker);
				if (split.length > 1) {
					displayResult += split[0];
					displayResult += '\\rlap{' + options.outputDecimalMarker + '}{' + moddedAngleSymbolSecond + '}';
					displayResult += split[1];
				} else {
					displayResult += number;
					displayResult += options.numberAngleProduct;
					displayResult += moddedAngleSymbolSecond;
				}
			} else {
				displayResult += displayNumber(ang.seconds, options);
				displayResult += options.numberAngleProduct;
				displayResult += moddedAngleSymbolSecond
			}
		}

	}
	//console.log(displayResult);
	return displayResult;
}


export function processAngle(parser: TexParser): MmlNode {

	const globalOptions: IOptions = { ...parser.options as IOptions };

	const localOptions = findOptions(parser);

	//const options = processOptions(globalOptions, localOptions);
	//options.forEach((v, k) => globalOptions[k] = v);
	Object.assign(globalOptions, localOptions);

	const text = parser.GetArgument('ang');

	// FIXME:  processOption here twice in processAngle?  
	//processOptions(globalOptions, localOptionString);  
	const ang = parseAngle(parser, text, globalOptions);

	// TODO: consider error checking result
	// Is there an exponent??  Throw an error... or ignore it?

	// transform angle format
	modeMapping.get(globalOptions.angleMode)(ang);

	const displayResult = displayAngle(ang, globalOptions);

	const mml = (new TexParser(displayResult, parser.stack.env, parser.configuration)).mml();

	return mml;
}