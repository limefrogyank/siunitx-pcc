import TexParser from "mathjax-full/js/input/tex/TexParser";
import { INumberPiece, IUncertainty } from "./numMethods";
import { INumOutputOptions, IOptions } from "./options";
import { AbstractMmlTokenNode, MmlNode, TextNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import { GlobalParser } from "./siunitx";
import NodeUtil from "mathjax-full/js/input/tex/NodeUtil";

const spacerMap: Record<string, string> = {
	'\\,': '\u2009',	// \, 3/18 quad
	'\\ ': ' ',			// space
	'\\quad': '\u2001', // em quad
	'\\qquad': '\u2001\u2001', // double em quad
	'\\:': '\u2005', 	// \: is actually bigger than \, 4/18 quad
	'\\;': '\u2004'		// \; is actually bigger than \: 5/18 quad
};

// Naive function that assumes there is only one child for each node with children
function findInnerText(node: MmlNode):string{
	let inner = node;
	while (!inner.isToken && inner.childNodes.length > 0){
		inner = inner.childNodes[0] as MmlNode;
	}
	if (inner.isToken){
		return NodeUtil.getText(inner as TextNode);
	} else {
		return "";
	}
}

function addSpacing(text: string, digitGroupSize: number, minimum: number, spacer: string, reverse: boolean, digitGroupFirstSize?: number, digitGroupOtherSize?: number) {
	let mmlSpacer = spacerMap[spacer.trimStart()];
	if (mmlSpacer === undefined) {
		// instead of copying spacer, 
		// should auto parse latex and extract unicode from mml
		const spacerNode = (new TexParser(spacer, GlobalParser.stack.env, GlobalParser.configuration)).mml();
		mmlSpacer = findInnerText(spacerNode);
	}

	if (text.length >= minimum) {
		const arr = text.split('');
		let adjusted = 0;
		const firstCount = (digitGroupFirstSize != -1 && digitGroupFirstSize != undefined) ? digitGroupFirstSize : digitGroupSize;
		let fluidCount = firstCount;
		if (reverse) {
			for (let i = firstCount; i < arr.length; i += fluidCount) {
				text = text.slice(0, i + adjusted) + mmlSpacer + text.slice(i + adjusted, text.length + adjusted);
				adjusted += mmlSpacer.length;
				fluidCount = (digitGroupOtherSize != -1 && digitGroupOtherSize != undefined) ? digitGroupOtherSize : digitGroupSize;
			}
		} else {
			for (let i = arr.length - firstCount; i >= 0; i -= fluidCount) {
				text = text.slice(0, i) + mmlSpacer + text.slice(i, text.length + adjusted);
				adjusted += mmlSpacer.length;
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
				uncertainty.whole = uncertainty.whole.slice(0, Math.abs(diff));

			}

		}
	}
}

export function convertUncertaintyToBracket(uncertainty: IUncertainty, piece: INumberPiece, options: INumOutputOptions): void {
	if (uncertainty.type == 'bracket') {
		// check to make sure that uncertainty doesn't need a decimal point via 'compact marker' or 'full' (full adds zeros to fractional only uncertainty!)
		// should only be checked if there is NOT already a decimal point
		if (uncertainty.decimal === '' && (options.uncertaintyMode === 'compact-marker' || options.uncertaintyMode === 'full')) {
			const diff = uncertainty.whole.length - piece.fractional.length;
			if (diff > 0) {
				uncertainty.fractional = uncertainty.whole.slice(diff, uncertainty.whole.length);
				uncertainty.whole = uncertainty.whole.slice(0, diff);
				if (uncertainty.fractional !== '') {
					uncertainty.decimal = options.outputDecimalMarker;
				}
			} else if (diff < 0 && options.uncertaintyMode === 'full') {
				uncertainty.fractional = ''.padEnd(Math.abs(diff), '0') + uncertainty.whole;
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

// Deprecated
function displayUncertaintyBracket(uncertainty: IUncertainty, options: INumOutputOptions): string {
	let output = options.uncertaintySeparator;
	output += options.outputOpenUncertainty;
	output += uncertainty.whole;
	output += (options.uncertaintyMode === 'compact-marker' || options.uncertaintyMode === 'full') && uncertainty.decimal != '' ? options.outputDecimalMarker : '';
	output += uncertainty.fractional;
	output += options.outputCloseUncertainty;
	return output;
}

function displayUncertaintyBracketMml(uncertainty: IUncertainty, parser: TexParser, options: INumOutputOptions): MmlNode {
	const uncertaintySeparator = (new TexParser(options.uncertaintySeparator, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	const openUncertainty = (new TexParser(options.outputOpenUncertainty, GlobalParser.stack.env, GlobalParser.configuration)).mml();

	let number = uncertainty.whole;
	number += (options.uncertaintyMode === 'compact-marker' || options.uncertaintyMode === 'full') && uncertainty.decimal != '' ? options.outputDecimalMarker : '';
	number += uncertainty.fractional;
	const numberNode = parser.create('token', 'mn', {}, number);
	const closeUncertainty = (new TexParser(options.outputCloseUncertainty, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	const mrow = parser.create('node', 'mrow', [uncertaintySeparator, openUncertainty, numberNode, closeUncertainty]);
	return mrow;
}

// Deprecated
function displayUncertaintyPlusMinus(uncertainty: IUncertainty, options: INumOutputOptions): string {
	return '\\pm' + displayNumber(uncertainty, options);
}

function displayUncertaintyPlusMinusMml(uncertainty: IUncertainty, parser: TexParser, options: INumOutputOptions): MmlNode {
	const numberNode = displayNumberMml(uncertainty, parser, options as IOptions);
	const plusMinusNode = parser.create('token', 'mo', {}, '\u00b1'); // plus-minus sign 
	const mrow = parser.create('node', 'mrow', [plusMinusNode, numberNode]);
	return mrow;
}

// Deprecated
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

const uncertaintyModeMmlMapping = new Map<string, (uncertainty: IUncertainty, value: INumberPiece, parser: TexParser, options: INumOutputOptions) => MmlNode>([
	['separate', (uncertainty: IUncertainty, value: INumberPiece, parser: TexParser, options: INumOutputOptions): MmlNode => {
		convertUncertaintyToPlusMinus(uncertainty, value, options);
		return displayUncertaintyPlusMinusMml(uncertainty, parser, options);
	}],
	['compact', (uncertainty: IUncertainty, value: INumberPiece, parser: TexParser, options: INumOutputOptions): MmlNode => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracketMml(uncertainty, parser, options);
	}],
	['full', (uncertainty: IUncertainty, value: INumberPiece, parser: TexParser, options: INumOutputOptions): MmlNode => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracketMml(uncertainty, parser, options);
	}],
	['compact-marker', (uncertainty: IUncertainty, value: INumberPiece, parser: TexParser, options: INumOutputOptions): MmlNode => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracketMml(uncertainty, parser, options);
	}],
])


export function displayNumber(piece: INumberPiece, options: INumOutputOptions): string {
	let output = '';
	let mmlString = '';
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
			//output += '\\mmlToken{mrow}{\\mmlToken{mo}{+}}';
			output += '\\mmlToken{mo}[rspace="0em", lspace="0em"]{+}';
		} else {
			if (piece.sign !== '') {
				//output += `\\mmlToken{mrow}{\\mmlToken{mo}{${piece.sign}}}`;
				output += `\\mmlToken{mo}[rspace="0em", lspace="0em"]{${piece.sign}}`;
			}
		}
	}

	// if unity mantissa AND don't print it, then we don't need the rest of this.
	if (piece.whole == '1' && piece.fractional == '' && !options.printUnityMantissa) {
		// don't do anything UNLESS exponent is also zero and printZeroExponent is false
		if (!options.printZeroExponent && (piece.exponent == '' || (piece.exponent == '1' && piece.exponentSign != '-'))) {
			mmlString += '1';
		}
	} else {
		if ((piece.whole == '' && piece.fractional) || piece.whole == '0') {
			if (options.printZeroInteger) {
				mmlString += '0';
			}
		} else {
			mmlString += piece.whole;
		}
		mmlString += (piece.decimal != '' ? options.outputDecimalMarker : '');
		if (options.zeroDecimalAsSymbol && +(piece.fractional) == 0) {
			// hack: insert searchable identifier
			mmlString += options.zeroSymbol;
		} else {
			mmlString += piece.fractional;
		}
	}

	output += `\\mmlToken{mn}{${mmlString}}`;
	mmlString = '';

	// display uncertanties (if not null)
	piece.uncertainty?.forEach(v => {
		output += uncertaintyModeMapping.get(options.uncertaintyMode)?.(v, piece, options);
	});

	if (options.printZeroExponent && (piece.exponent == '' || (piece.exponent == '0'))) {
		if (options.outputExponentMarker != '') {
			output += options.outputExponentMarker;
			output += '0';
		} else {
			if (options.tightSpacing) {
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
					if (options.tightSpacing) {
						output += (piece.whole != '' || piece.fractional != '') ? '{' + options.exponentProduct + '}' : '';
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

	//const mml = (new TexParser(output, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	// resume hack: find zero symbol replacement

	return output;
}

export function displayNumberMml(num: INumberPiece, parser: TexParser, options: IOptions): MmlNode {
	let rootNode: MmlNode;
	let currentNode: MmlNode;
	if (options.negativeColor != '') {
		rootNode = parser.create('node', 'mstyle', [], { mathcolor: options.negativeColor });
	}
	let mrow = parser.create('node', 'mrow');
	currentNode = mrow;
	if (rootNode === undefined) {
		rootNode = mrow;
	} else {
		rootNode.appendChild(mrow);
	}

	groupNumbersMap.get(options.groupDigits)?.(num, options);

	if (options.bracketNegativeNumbers) {
		if (num.sign === '-') {
			const leftBracket = parser.create('token', 'mo', {}, '(');
			currentNode.appendChild(leftBracket);
		}
	} else {
		if (options.printImplicitPlus && num.sign === '') {
			const sign = parser.create('token', 'mo', { rspace: "0em", lspace: "0em" }, '+');
			currentNode.appendChild(sign);
		} else {
			if (num.sign !== '') {
				const sign = parser.create('token', 'mo', { rspace: "0em", lspace: "0em" }, num.sign);
				currentNode.appendChild(sign);
			}
		}
	}

	let numberString = '';
	let trailingMml: MmlNode;
	// if unity mantissa AND don't print it, then we don't need the rest of this.
	if (num.whole == '1' && num.fractional == '' && !options.printUnityMantissa) {
		// don't do anything UNLESS exponent is also zero and printZeroExponent is false
		if (!options.printZeroExponent && (num.exponent == '' || (num.exponent == '1' && num.exponentSign != '-'))) {
			numberString += '1';
		}
	} else {
		if ((num.whole == '' && num.fractional) || num.whole == '0') {
			if (options.printZeroInteger) {
				numberString += '0';
			}
		} else {
			numberString += num.whole;
		}
		numberString += (num.decimal != '' ? options.outputDecimalMarker : '');
		if (options.zeroDecimalAsSymbol && +(num.fractional) == 0) {
			trailingMml = (new TexParser(options.zeroSymbol, GlobalParser.stack.env, GlobalParser.configuration)).mml();
		} else {
			numberString += num.fractional;
		}
	}
	const numberNode = parser.create('token', 'mn', {}, numberString);
	currentNode.appendChild(numberNode);
	if (trailingMml != null) {
		currentNode.appendChild(trailingMml);
	}

	// display uncertanties (if not null)
	num.uncertainty?.forEach(v => {
		const uncertaintyNode = uncertaintyModeMmlMapping.get(options.uncertaintyMode)?.(v, num, parser, options);
		currentNode.appendChild(uncertaintyNode);
	});

	const exponentProductNode = (new TexParser(options.exponentProduct, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	const exponentBaseNode = (new TexParser(options.exponentBase, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	if (options.printZeroExponent && (num.exponent == '' || (num.exponent == '0'))) {
		const zeroNode = parser.create('token', 'mn', {}, '0');
		if (options.outputExponentMarker != '') {
			const customExponentMarker = parser.create('token', 'mi', { mathvariant: 'normal' }, options.outputExponentMarker);
			currentNode.appendChild(customExponentMarker);
			currentNode.appendChild(zeroNode);
		} else {
			if (options.tightSpacing) {
				exponentProductNode.attributes.set('lspace', '0em');
				exponentProductNode.attributes.set('rspace', '0em');
			}
			const exponential = parser.create('node', 'msup', [exponentBaseNode, zeroNode]);
			currentNode.appendChild(exponentProductNode);
			currentNode.appendChild(exponential);
		}
	} else if (num.exponent != '' && num.exponent != '0') {
		const exponentSignNode = parser.create('token', 'mo', {}, num.exponentSign);
		const exponentValueNode = parser.create('token', 'mn', {}, num.exponent);
		const supPart = num.exponentSign === '-'
			? parser.create('node', 'mrow', [exponentSignNode, exponentValueNode])
			: exponentValueNode;
		const exponential = parser.create('node', 'msup', [exponentBaseNode, supPart]);
		// if unity mantissa AND don't print it, then can't print exponentMarkers (E) nor exponentProduct (\\times)
		if (num.whole == '1' && num.fractional == '' && !options.printUnityMantissa) {
			currentNode.appendChild(exponential);
		} else {
			if (num.exponentMarker != ''){
				if (options.outputExponentMarker != '') {
					const customExponentMarker = (new TexParser(options.outputExponentMarker, GlobalParser.stack.env, GlobalParser.configuration)).mml();
					//const customExponentMarker = parser.create('token', 'mi', { }, options.outputExponentMarker);
					currentNode.appendChild(customExponentMarker);
					currentNode.appendChild(supPart);
				} else {
					if (num.whole != '' || num.fractional != ''){
						if (options.tightSpacing){
							exponentProductNode.attributes.set('lspace', '0em');
							exponentProductNode.attributes.set('rspace', '0em');
						}					
						currentNode.appendChild(exponentProductNode);
					}
					currentNode.appendChild(exponential);
				}
			}
		}
	}

	if (options.bracketNegativeNumbers) {
		if (num.sign == '-') {
			const rightBracket = parser.create('token', 'mo', {}, ')');
			currentNode.appendChild(rightBracket);
		}
	}

	return rootNode;
}

export function displayOutputMml(num: INumberPiece, parser: TexParser, options: IOptions): MmlNode[] {
	let rootNodes: MmlNode[] = [];
	let currentNode: MmlNode;
	if (options.numberColor != '') {
		currentNode = parser.create('node', 'mstyle', [], { mathcolor: options.numberColor });
		rootNodes.push(currentNode);
	} else if (options.color != '') {
		currentNode = parser.create('node', 'mstyle', [], { mathcolor: options.color });
		rootNodes.push(currentNode);
	}
		
	if (num.prefix !== '') {
		const prefix = (new TexParser(num.prefix, GlobalParser.stack.env, GlobalParser.configuration)).mml();
		prefix.attributes.set('rspace', '0em');
		prefix.attributes.set('lspace', '0em');
		if (currentNode == null){
			rootNodes.push(prefix);
		} else {
			currentNode.appendChild(prefix);
		}
	}

	const numberNode = displayNumberMml(num, parser, options);
	if (currentNode == null){
		rootNodes.push(numberNode);
	} else {
		currentNode.appendChild(numberNode);
	}

	return rootNodes;
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