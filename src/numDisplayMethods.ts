import TexParser from "mathjax-full/js/input/tex/TexParser";
import { INumberPiece, IUncertainty } from "./numMethods";
import { INumOutputOptions, IOptions } from "./options";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";

function addSpacing(text: string, digitGroupSize: number, minimum: number, spacer: string, reverse: boolean, digitGroupFirstSize?: number, digitGroupOtherSize?: number) {
	if (text.length >= minimum) {
		const arr = text.split('');
		let adjusted = 0;
		const firstCount = (digitGroupFirstSize != -1 && digitGroupFirstSize != undefined) ? digitGroupFirstSize : digitGroupSize;
		let fluidCount = firstCount;
		if (reverse) {
			for (let i = firstCount; i < arr.length; i += fluidCount) {
				text = text.slice(0, i + adjusted) + spacer + text.slice(i + adjusted, text.length + adjusted);
				adjusted += spacer.length;
				fluidCount = (digitGroupOtherSize != -1 && digitGroupOtherSize != undefined) ? digitGroupOtherSize : digitGroupSize;
			}
		} else {
			for (let i = arr.length - firstCount; i >= 0; i -= fluidCount) {
				text = text.slice(0, i) + spacer + text.slice(i, text.length + adjusted);
				adjusted += spacer.length;
				fluidCount = (digitGroupOtherSize != -1 && digitGroupOtherSize != undefined) ? digitGroupOtherSize : digitGroupSize;
			}
		}
	}
	return text;
}


const groupNumbersMap = new Map<string, (num: INumberPiece, options: INumOutputOptions) => void>([
	['all', (num: INumberPiece, options: INumOutputOptions): void => {
		num.whole = addSpacing(num.whole, options.digitGroupSize, options.groupMinimumDigits, options.groupSeparator, false, options.digitGroupFirstSize, options.digitGroupOtherSize);
		num.fractional = addSpacing(num.fractional, options.digitGroupSize, options.groupMinimumDigits, options.groupSeparator, true, options.digitGroupFirstSize, options.digitGroupOtherSize);

	}],
	['decimal', (num: INumberPiece, options: INumOutputOptions): void => {
		num.fractional = addSpacing(num.fractional, options.digitGroupSize, options.groupMinimumDigits, options.groupSeparator, true, options.digitGroupFirstSize, options.digitGroupOtherSize);

	}],
	['integer', (num: INumberPiece, options: INumOutputOptions): void => {
		num.whole = addSpacing(num.whole, options.digitGroupSize, options.groupMinimumDigits, options.groupSeparator, false, options.digitGroupFirstSize, options.digitGroupOtherSize);
	}],
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['none', (): void => { }]
]);


function convertUncertaintyToPlusMinus(uncertainty: IUncertainty, piece: INumberPiece, options: INumOutputOptions): void {
	if (uncertainty.type != 'pm') {
		// if there's a decimal in the uncertainty, then it's ok to display as-is
		if (uncertainty.decimal == '') {
			// add zeros, move whole to fraction part, and potentially add decimal and whole
			const diff = piece.fractional.length - uncertainty.whole.length;
			if (diff >= 0) {
				//move whole value uncertainty to fractional part and pad left with zeros if needed
				// i.e. 12.455(4) ==> 12.455 +- 0.004  (diff = 2)
				for (let i = 0; i < diff; i++) {
					uncertainty.fractional += "0";
				}
				uncertainty.fractional += uncertainty.whole;
				uncertainty.whole = '0';
				uncertainty.decimal = options.outputDecimalMarker;
			} else {
				// uncertainty is bigger than fraction.  Need to split uncertainty to whole and fractional.
				// i.e. 123.4(12) ==> 123.4 +- 1.2  (diff = -1)
				// i.e. 123.4(144) ==> 123.4 +- 14.4 (diff = -2)
				// i.e. 123.45(144) ==> 123.45 +- 1.44 (diff = -1)
				uncertainty.fractional = uncertainty.whole.slice(Math.abs(diff));
				uncertainty.decimal = options.outputDecimalMarker;
				uncertainty.whole = uncertainty.whole.slice(0,Math.abs(diff));
				
			}

		}
	}
}

export function convertUncertaintyToBracket(uncertainty: IUncertainty, piece: INumberPiece, options: INumOutputOptions): void {
	if (uncertainty.type == 'bracket') {
		// check to make sure that uncertainty doesn't need a decimal point via 'compact marker' or 'full' (full adds zeros to fractional only uncertainty!)
		// should only be checked if there is NOT already a decimal point
		if (uncertainty.decimal === '' && (options.uncertaintyMode === 'compact-marker' || options.uncertaintyMode === 'full')){
			const diff = uncertainty.whole.length - piece.fractional.length;
			if (diff > 0 ) {
				uncertainty.fractional = uncertainty.whole.slice(diff, uncertainty.whole.length);
				uncertainty.whole = uncertainty.whole.slice(0, diff);
				if (uncertainty.fractional !== ''){
					uncertainty.decimal = options.outputDecimalMarker;
				}
			} else if (diff < 0 && options.uncertaintyMode === 'full'){
				uncertainty.fractional = ''.padEnd(Math.abs(diff),'0') + uncertainty.whole;
				uncertainty.whole = '0';
				uncertainty.decimal = options.outputDecimalMarker;
			} 
		}

	} else {
		//easiest way is to convert to a number and check if less than zero
		const strNum = uncertainty.whole + uncertainty.decimal + uncertainty.fractional;
		const num = +(strNum);
		// if less than 1 (just a fraction), then remove leading zeros.  Else leave it as is.
		if (num < 1) {
			let position = 0;
			for (let i = 0; i < uncertainty.fractional.length; i++) {
				if (uncertainty.fractional[i] != '0') {
					break;
				}
				position++;
			}
			uncertainty.whole = uncertainty.fractional.slice(position, uncertainty.fractional.length);
			uncertainty.decimal = '';
			uncertainty.fractional = '';
		}
	}
}

function displayUncertaintyBracket(uncertainty: IUncertainty, options: INumOutputOptions): string {
	let output = options.uncertaintySeparator;
	output += options.outputOpenUncertainty;
	output += uncertainty.whole;
	output += (options.uncertaintyMode === 'compact-marker' || options.uncertaintyMode === 'full') && uncertainty.decimal != '' ? options.outputDecimalMarker : '';
	output += uncertainty.fractional;
	output += options.outputCloseUncertainty;
	return output;
}

function displayUncertaintyPlusMinus(uncertainty: IUncertainty, options: INumOutputOptions): string {
	return '\\pm' + displayNumber(uncertainty, options);
}

const uncertaintyModeMapping = new Map<string, (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions) => string>([
	['separate', (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions): string => {
		convertUncertaintyToPlusMinus(uncertainty, value, options);
		return displayUncertaintyPlusMinus(uncertainty, options);
	}],
	['compact', (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions): string => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracket(uncertainty, options);
	}],
	['full', (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions): string => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracket(uncertainty, options);
	}],
	['compact-marker', (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions): string => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracket(uncertainty, options);
	}],
])


export function displayNumber(piece: INumberPiece, options: INumOutputOptions): string {
	let output = '';
	groupNumbersMap.get(options.groupDigits)?.(piece, options);

	if (options.negativeColor != '') {
		output += '{\\color{' + options.negativeColor + '}';
	}
	if (options.bracketNegativeNumbers) {
		if (piece.sign == '-') {
			output += '(';
		}
	} else {
		// brackets remove extra spacing intended for math equation
		if (options.printImplicitPlus && piece.sign == '') {
			output += '{+}';
		} else {
			output += '{' + piece.sign + '}';
		}
	}

	// if unity mantissa AND don't print it, then we don't need the rest of this.
	if (piece.whole == '1' && piece.fractional == '' && !options.printUnityMantissa) {
		// don't do anything UNLESS exponent is also zero and printZeroExponent is false
		if (!options.printZeroExponent && (piece.exponent == '' || (piece.exponent == '1' && piece.exponentSign != '-'))) {
			output += '1';
		}
	} else {
		if ((piece.whole == '' && piece.fractional) || piece.whole == '0') {
			if (options.printZeroInteger) {
				output += '0';
			}
		} else {
			output += piece.whole;
		}
		output += (piece.decimal != '' ? options.outputDecimalMarker : '');
		if (options.zeroDecimalAsSymbol && +(piece.fractional) == 0) {
			output += options.zeroSymbol;
		} else {
			output += piece.fractional;
		}
	}
	// display uncertanties (if not null)
	piece.uncertainty?.forEach(v => {
		output += uncertaintyModeMapping.get(options.uncertaintyMode)?.(v, piece, options);
	});

	if (options.printZeroExponent && (piece.exponent == '' || (piece.exponent == '0'))) {
		if (options.outputExponentMarker != '') {
			output += options.outputExponentMarker;
			output += '0';
		} else {
			if (options.tightSpacing){
				output += '{' + options.exponentProduct + '}';
			} else {
				output += options.exponentProduct;
			}
			output += options.exponentBase;
			output += '^{0}';
		}
	} else if (piece.exponent != '' && piece.exponent != '0') {
		// if unity mantissa AND don't print it, then can't print exponentMarkers (E) nor exponentProduct (\\times)
		if (piece.whole == '1' && piece.fractional == '' && !options.printUnityMantissa) {
			output += options.exponentBase;
			output += '^{' + piece.exponentSign + piece.exponent + '}';
		} else {
			if (piece.exponentMarker != '') {
				if (options.outputExponentMarker != '') {
					output += options.outputExponentMarker;
					output += piece.exponentSign + piece.exponent;
				} else {
					if (options.tightSpacing){
						output += (piece.whole != '' || piece.fractional != '') ? '{'+options.exponentProduct + '}': '';
					} else {
						output += (piece.whole != '' || piece.fractional != '') ? options.exponentProduct : '';
					}
					output += options.exponentBase;
					output += '^{' + piece.exponentSign + piece.exponent + '}';
				}
			}
		}
	}

	if (options.bracketNegativeNumbers) {
		if (piece.sign == '-') {
			output += ')';
		}
	}
	if (options.negativeColor != '') {
		output += '}';
	}

	return output;
}

export function displayOutputMml(num: INumberPiece, parser: TexParser, options: IOptions) : MmlNode{
	let mml = parser.create('node', 'mrow');
	let currentNode: MmlNode;
	if (options.numberColor != '') {
		currentNode = parser.create('node', 'mstyle', options.numberColor  );
		mml.appendChild(currentNode);
		//output += '{\\color{' + options.numberColor + '}';
		//closeColor = true;
	} else if (options.color != '') {
		currentNode = parser.create('node', 'mstyle',[],options.color  )
		mml.appendChild(currentNode);
		//output += '{\\color{' + options.color + '}';
		//closeColor = true;
	}

	//groupNumbersMap.get(options.groupDigits)?.(num, options);

	if (options.negativeColor != '') {
		console.log(num.whole);
		
		let num1 = parser.create('node', 'mn', [], {}, parser.create('text', "12"));
		let space1 = parser.create('node', 'mo', [], {separator: true, "semantic-type": "ignore"}, parser.create('text', "\u2009"));
		let num2 = parser.create('node', 'mn', [], {}, parser.create('text', "345"));
		currentNode = parser.create('node', 'mstyle',[num1, space1, num2], {mathcolor: options.negativeColor});
		mml.appendChild(currentNode);
	}

	
	return mml;
}

export function displayOutput(num: INumberPiece, options: IOptions): string {

	let output = '';

	let closeColor: boolean = false;
	if (options.numberColor != '') {
		output += '{\\color{' + options.numberColor + '}';
		closeColor = true;
	} else if (options.color != '') {
		output += '{\\color{' + options.color + '}';
		closeColor = true;
	}

	// display any prefix symbol such as less than, greater than, etc.
	// brackets will remove the extra space that normally occurs with symbol
	output += '{' + num.prefix + '}';
	
	// display main number
	output += displayNumber(num, options);

	if (closeColor) {
		output += '}';
	}


	return output;
}