import TexParser from "mathjax-full/js/input/tex/TexParser";
import { INumberPiece, IUncertainty } from "./numMethods";
import { IOptions } from "./options/options";
import { INumOutputOptions } from "./options/numberOptions";
import { MmlNode, TextNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import { GlobalParser } from "./siunitx";
import NodeUtil from "mathjax-full/js/input/tex/NodeUtil";

export const spacerMap: Record<string, string> = {
	'\\,': '\u2009',	// \, 3/18 quad
	'\\ ': ' ',			// space
	'\\quad': '\u2001', // em quad
	'\\qquad': '\u2001\u2001', // double em quad
	'\\:': '\u2005', 	// \: is actually bigger than \, 4/18 quad
	'\\;': '\u2004'		// \; is actually bigger than \: 5/18 quad
};

// Naive function that assumes there is only one child for each node with children
export function findInnerText(node: MmlNode): string {
	let inner = node;
	while (!inner.isToken && inner.childNodes.length > 0) {
		inner = inner.childNodes[0] as MmlNode;
	}
	if (inner.isToken) {
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
		const firstCount = (digitGroupFirstSize !== -1 && digitGroupFirstSize !== undefined) ? digitGroupFirstSize : digitGroupSize;
		let fluidCount = firstCount;
		if (reverse) {
			for (let i = firstCount; i < arr.length; i += fluidCount) {
				text = text.slice(0, i + adjusted) + mmlSpacer + text.slice(i + adjusted, text.length + adjusted);
				adjusted += mmlSpacer.length;
				fluidCount = (digitGroupOtherSize !== -1 && digitGroupOtherSize !== undefined) ? digitGroupOtherSize : digitGroupSize;
			}
		} else {
			for (let i = arr.length - firstCount; i >= 0; i -= fluidCount) {
				text = text.slice(0, i) + mmlSpacer + text.slice(i, text.length + adjusted);
				adjusted += mmlSpacer.length;
				fluidCount = (digitGroupOtherSize !== -1 && digitGroupOtherSize !== undefined) ? digitGroupOtherSize : digitGroupSize;
			}
		}
	}
	return text;
}


const groupNumbersMap = new Map<string, (num: INumberPiece, options: INumOutputOptions) => void>([
	['all', (num: INumberPiece, options: INumOutputOptions): void => {
		num.whole = addSpacing(num.whole, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], false, options["digit-group-first-size"], options["digit-group-other-size"]);
		num.fractional = addSpacing(num.fractional, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], true, options["digit-group-first-size"], options["digit-group-other-size"]);

	}],
	['decimal', (num: INumberPiece, options: INumOutputOptions): void => {
		num.fractional = addSpacing(num.fractional, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], true, options["digit-group-first-size"], options["digit-group-other-size"]);

	}],
	['integer', (num: INumberPiece, options: INumOutputOptions): void => {
		num.whole = addSpacing(num.whole, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], false, options["digit-group-first-size"], options["digit-group-other-size"]);
	}],
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['none', (): void => { }]
]);


function convertUncertaintyToPlusMinus(uncertainty: IUncertainty, piece: INumberPiece, options: INumOutputOptions): void {
	if (uncertainty.type !== 'pm') {
		// if there's a decimal in the uncertainty, then it's ok to display as-is
		if (uncertainty.decimal === '') {
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
				uncertainty.decimal = options["output-decimal-marker"];
			} else {
				// uncertainty is bigger than fraction.  Need to split uncertainty to whole and fractional.
				// i.e. 123.4(12) ==> 123.4 +- 1.2  (diff = -1)
				// i.e. 123.4(144) ==> 123.4 +- 14.4 (diff = -2)
				// i.e. 123.45(144) ==> 123.45 +- 1.44 (diff = -1)
				uncertainty.fractional = uncertainty.whole.slice(Math.abs(diff));
				uncertainty.decimal = options["output-decimal-marker"];
				uncertainty.whole = uncertainty.whole.slice(0, Math.abs(diff));

			}

		}
	}
}

export function convertUncertaintyToBracket(uncertainty: IUncertainty, piece: INumberPiece, options: INumOutputOptions): void {
	if (uncertainty.type === 'bracket') {
		// check to make sure that uncertainty doesn't need a decimal point via 'compact marker' or 'full' (full adds zeros to fractional only uncertainty!)
		// should only be checked if there is NOT already a decimal point
		if (uncertainty.decimal === '' && (options["uncertainty-mode"] === 'compact-marker' || options["uncertainty-mode"] === 'full')) {
			const diff = uncertainty.whole.length - piece.fractional.length;
			if (diff > 0) {
				uncertainty.fractional = uncertainty.whole.slice(diff, uncertainty.whole.length);
				uncertainty.whole = uncertainty.whole.slice(0, diff);
				if (uncertainty.fractional !== '') {
					uncertainty.decimal = options["output-decimal-marker"];
				}
			} else if (diff < 0 && options["uncertainty-mode"] === 'full') {
				uncertainty.fractional = ''.padEnd(Math.abs(diff), '0') + uncertainty.whole;
				uncertainty.whole = '0';
				uncertainty.decimal = options["output-decimal-marker"];
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
				if (uncertainty.fractional[i] !== '0') {
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
	let output = options["uncertainty-separator"];
	output += options["output-open-uncertainty"];
	output += uncertainty.whole;
	output += (options["uncertainty-mode"] === 'compact-marker' || options["uncertainty-mode"] === 'full') && uncertainty.decimal !== '' ? options["output-decimal-marker"] : '';
	output += uncertainty.fractional;
	output += options["output-close-uncertainty"];
	return output;
}

function displayUncertaintyBracketMml(uncertainty: IUncertainty, parser: TexParser, options: INumOutputOptions): MmlNode {
	const uncertaintySeparator = (new TexParser(options["uncertainty-separator"], GlobalParser.stack.env, GlobalParser.configuration)).mml();
	const openUncertainty = (new TexParser(options["output-open-uncertainty"], GlobalParser.stack.env, GlobalParser.configuration)).mml();

	let number = uncertainty.whole;
	number += (options["uncertainty-mode"] === 'compact-marker' || options["uncertainty-mode"] === 'full') && uncertainty.decimal !== '' ? options["output-decimal-marker"] : '';
	number += uncertainty.fractional;
	const numberNode = parser.create('token', 'mn', {}, number);
	const closeUncertainty = (new TexParser(options["output-close-uncertainty"], GlobalParser.stack.env, GlobalParser.configuration)).mml();
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
	const mrow = parser.create('node', 'mrow', [plusMinusNode, numberNode], { 'data-siunitx-uncertainty': true });
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
	groupNumbersMap.get(options["group-digits"])?.(piece, options);

	if (options["negative-color"] !== '') {
		output += '{\\color{' + options["negative-color"] + '}';
	}
	if (options["bracket-negative-numbers"]) {
		if (piece.sign === '-') {
			output += '(';
		}
	} else {
		// brackets remove extra spacing intended for math equation
		if (options["print-implicit-plus"] && piece.sign === '') {
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
	if (piece.whole === '1' && piece.fractional === '' && !options["print-unity-mantissa"]) {
		// don't do anything UNLESS exponent is also zero and printZeroExponent is false
		if (!options["print-zero-exponent"] && (piece.exponent === '' || (piece.exponent === '1' && piece.exponentSign !== '-'))) {
			mmlString += '1';
		}
	} else {
		if ((piece.whole === '' && piece.fractional) || piece.whole === '0') {
			if (options["print-zero-integer"]) {
				mmlString += '0';
			}
		} else {
			mmlString += piece.whole;
		}
		mmlString += (piece.decimal !== '' ? options["output-decimal-marker"] : '');
		if (options["zero-decimal-as-symbol"] && +(piece.fractional) === 0) {
			// hack: insert searchable identifier
			mmlString += options["zero-symbol"];
		} else {
			mmlString += piece.fractional;
		}
	}

	output += `\\mmlToken{mn}{${mmlString}}`;
	mmlString = '';

	// display uncertanties (if not null)
	piece.uncertainty?.forEach(v => {
		output += uncertaintyModeMapping.get(options["uncertainty-mode"])?.(v, piece, options);
	});

	if (options["print-zero-exponent"] && (piece.exponent === '' || (piece.exponent === '0'))) {
		if (options["output-exponent-marker"] !== '') {
			output += options["output-exponent-marker"];
			output += '0';
		} else {
			if (options["tight-spacing"]) {
				output += '{' + options["exponent-product"] + '}';
			} else {
				output += options["exponent-product"];
			}
			output += options["exponent-base"];
			output += '^{0}';
		}
	} else if (piece.exponent !== '' && piece.exponent !== '0') {
		// if unity mantissa AND don't print it, then can't print exponentMarkers (E) nor exponentProduct (\\times)
		if (piece.whole === '1' && piece.fractional === '' && !options["print-unity-mantissa"]) {
			output += options["exponent-base"];
			output += '^{' + piece.exponentSign + piece.exponent + '}';
		} else {
			if (piece.exponentMarker !== '') {
				if (options["output-exponent-marker"] !== '') {
					output += options["output-exponent-marker"];
					output += piece.exponentSign + piece.exponent;
				} else {
					if (options["tight-spacing"]) {
						output += (piece.whole !== '' || piece.fractional !== '') ? '{' + options["exponent-product"] + '}' : '';
					} else {
						output += (piece.whole !== '' || piece.fractional !== '') ? options["exponent-product"] : '';
					}
					output += options["exponent-base"];
					output += '^{' + piece.exponentSign + piece.exponent + '}';
				}
			}
		}
	}

	if (options["bracket-negative-numbers"]) {
		if (piece.sign === '-') {
			output += ')';
		}
	}
	if (options["negative-color"] !== '') {
		output += '}';
	}

	//const mml = (new TexParser(output, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	// resume hack: find zero symbol replacement

	return output;
}

export function createExponentMml(num:INumberPiece, parser: TexParser, options: IOptions):MmlNode[]{
	const nodes = [];
	const exponentProductNode = (new TexParser(options["exponent-product"], GlobalParser.stack.env, GlobalParser.configuration)).mml();
	const exponentBaseNode = (new TexParser(options["exponent-base"], GlobalParser.stack.env, GlobalParser.configuration)).mml();
	if (options["print-zero-exponent"] && (num.exponent === '' || (num.exponent === '0'))) {
		const zeroNode = parser.create('token', 'mn', {}, '0');
		if (options["output-exponent-marker"] !== '') {
			const customExponentMarker = parser.create('token', 'mi', { mathvariant: 'normal' }, options["output-exponent-marker"]);
			nodes.push(customExponentMarker);
			nodes.push(zeroNode);
			//currentNode.appendChild(customExponentMarker);
			//currentNode.appendChild(zeroNode);
		} else {
			if (options["tight-spacing"]) {
				exponentProductNode.attributes.set('lspace', '0em');
				exponentProductNode.attributes.set('rspace', '0em');
			}
			const exponential = parser.create('node', 'msup', [exponentBaseNode, zeroNode]);
			nodes.push(exponentProductNode);
			nodes.push(exponential);
			// currentNode.appendChild(exponentProductNode);
			// currentNode.appendChild(exponential);
		}
	} else if (num.exponent !== '' && num.exponent !== '0') {
		const exponentSignNode = parser.create('token', 'mo', {}, num.exponentSign);
		const exponentValueNode = parser.create('token', 'mn', {}, num.exponent);
		const supPart = num.exponentSign === '-'
			? parser.create('node', 'mrow', [exponentSignNode, exponentValueNode])
			: exponentValueNode;
		const exponential = parser.create('node', 'msup', [exponentBaseNode, supPart]);
		// if unity mantissa AND don't print it, then can't print exponentMarkers (E) nor exponentProduct (\\times)
		if (num.whole === '1' && num.fractional === '' && !options["print-unity-mantissa"]) {
			//currentNode.appendChild(exponential);
			nodes.push(exponential);
		} else {
			if (num.exponentMarker !== '') {
				if (options["output-exponent-marker"] !== '') {
					const customExponentMarker = (new TexParser(options["output-exponent-marker"], GlobalParser.stack.env, GlobalParser.configuration)).mml();
					//const customExponentMarker = parser.create('token', 'mi', { }, options.outputExponentMarker);
					nodes.push(customExponentMarker);
					nodes.push(supPart);
					// currentNode.appendChild(customExponentMarker);
					// currentNode.appendChild(supPart);
				} else {
					if (num.whole !== '' || num.fractional !== '') {
						if (options["tight-spacing"]) {
							exponentProductNode.attributes.set('lspace', '0em');
							exponentProductNode.attributes.set('rspace', '0em');
						}
						nodes.push(exponentProductNode);
						// currentNode.appendChild(exponentProductNode);
					}
					nodes.push(exponential);
					// currentNode.appendChild(exponential);
				}
			}
		}
	}
	return nodes;
}

export function displayNumberMml(num: INumberPiece, parser: TexParser, options: IOptions): MmlNode {
	let rootNode: MmlNode;

	if (options["negative-color"] !== '') {
		rootNode = parser.create('node', 'mstyle', [], { mathcolor: options["negative-color"] });
	}
	const mrow = parser.create('node', 'mrow');
	const currentNode = mrow;
	if (rootNode === undefined) {
		rootNode = mrow;
	} else {
		rootNode.appendChild(mrow);
	}

	groupNumbersMap.get(options["group-digits"])?.(num, options);
	if (options["bracket-negative-numbers"]) {
		if (num.sign === '-') {
			const leftBracket = parser.create('token', 'mo', {}, '(');
			currentNode.appendChild(leftBracket);
		}
	} else {
		if (options["print-implicit-plus"] && num.sign === '') {
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
	if (num.whole === '1' && num.fractional === '' && !options["print-unity-mantissa"]) {
		// don't do anything UNLESS exponent is also zero and printZeroExponent is false
		if (!options["print-zero-exponent"] && (num.exponent === '' || (num.exponent === '1' && num.exponentSign !== '-'))) {
			numberString += '1';
		}
	} else {
		if ((num.whole === '' && num.fractional) || num.whole === '0') {
			if (options["print-zero-integer"]) {
				numberString += '0';
			}
		} else {
			numberString += num.whole;
		}
		numberString += (num.decimal !== '' ? options["output-decimal-marker"] : '');
		if (options["zero-decimal-as-symbol"] && +(num.fractional) === 0) {
			trailingMml = (new TexParser(options["zero-symbol"], GlobalParser.stack.env, GlobalParser.configuration)).mml();
		} else {
			numberString += num.fractional;
		}
	}
	const numberNode = parser.create('token', 'mn', {}, numberString);
	currentNode.appendChild(numberNode);
	if (trailingMml !== undefined) {
		currentNode.appendChild(trailingMml);
	}
	// display uncertanties (if not null)
	num.uncertainty?.forEach(v => {
		const uncertaintyNode = uncertaintyModeMmlMapping.get(options["uncertainty-mode"])?.(v, num, parser, options);
		currentNode.appendChild(uncertaintyNode);
	});
	
	const exponentNodes = createExponentMml( num, parser, options);
	exponentNodes.forEach(v=>{
		currentNode.appendChild(v);
	});
	// const exponentProductNode = (new TexParser(options.exponentProduct, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	// const exponentBaseNode = (new TexParser(options.exponentBase, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	// if (options.printZeroExponent && (num.exponent == '' || (num.exponent == '0'))) {
	// 	const zeroNode = parser.create('token', 'mn', {}, '0');
	// 	if (options.outputExponentMarker != '') {
	// 		const customExponentMarker = parser.create('token', 'mi', { mathvariant: 'normal' }, options.outputExponentMarker);
	// 		currentNode.appendChild(customExponentMarker);
	// 		currentNode.appendChild(zeroNode);
	// 	} else {
	// 		if (options.tightSpacing) {
	// 			exponentProductNode.attributes.set('lspace', '0em');
	// 			exponentProductNode.attributes.set('rspace', '0em');
	// 		}
	// 		const exponential = parser.create('node', 'msup', [exponentBaseNode, zeroNode]);
	// 		currentNode.appendChild(exponentProductNode);
	// 		currentNode.appendChild(exponential);
	// 	}
	// } else if (num.exponent != '' && num.exponent != '0') {
	// 	const exponentSignNode = parser.create('token', 'mo', {}, num.exponentSign);
	// 	const exponentValueNode = parser.create('token', 'mn', {}, num.exponent);
	// 	const supPart = num.exponentSign === '-'
	// 		? parser.create('node', 'mrow', [exponentSignNode, exponentValueNode])
	// 		: exponentValueNode;
	// 	const exponential = parser.create('node', 'msup', [exponentBaseNode, supPart]);
	// 	// if unity mantissa AND don't print it, then can't print exponentMarkers (E) nor exponentProduct (\\times)
	// 	if (num.whole == '1' && num.fractional == '' && !options.printUnityMantissa) {
	// 		currentNode.appendChild(exponential);
	// 	} else {
	// 		if (num.exponentMarker != '') {
	// 			if (options.outputExponentMarker != '') {
	// 				const customExponentMarker = (new TexParser(options.outputExponentMarker, GlobalParser.stack.env, GlobalParser.configuration)).mml();
	// 				//const customExponentMarker = parser.create('token', 'mi', { }, options.outputExponentMarker);
	// 				currentNode.appendChild(customExponentMarker);
	// 				currentNode.appendChild(supPart);
	// 			} else {
	// 				if (num.whole != '' || num.fractional != '') {
	// 					if (options.tightSpacing) {
	// 						exponentProductNode.attributes.set('lspace', '0em');
	// 						exponentProductNode.attributes.set('rspace', '0em');
	// 					}
	// 					currentNode.appendChild(exponentProductNode);
	// 				}
	// 				currentNode.appendChild(exponential);
	// 			}
	// 		}
	// 	}
	// }

	if (options["bracket-negative-numbers"]) {
		if (num.sign === '-') {
			const rightBracket = parser.create('token', 'mo', {}, ')');
			currentNode.appendChild(rightBracket);
		}
	}
	return rootNode;
}

export function displayOutputMml(num: INumberPiece, parser: TexParser, options: IOptions): MmlNode[] {
	const rootNodes: MmlNode[] = [];
	let currentNode: MmlNode;
	if (options.numberColor !== '') {
		currentNode = parser.create('node', 'mstyle', [], { mathcolor: options.numberColor });
		rootNodes.push(currentNode);
	} else if (options.color !== '') {
		currentNode = parser.create('node', 'mstyle', [], { mathcolor: options.color });
		rootNodes.push(currentNode);
	}

	if (num.prefix !== '') {
		const prefix = (new TexParser(num.prefix, GlobalParser.stack.env, GlobalParser.configuration)).mml();
		prefix.attributes.set('rspace', '0em');
		prefix.attributes.set('lspace', '0em');
		if (currentNode === undefined) {
			rootNodes.push(prefix);
		} else {
			currentNode.appendChild(prefix);
		}
	}

	const numberNode = displayNumberMml(num, parser, options);
	if (currentNode === undefined) {
		rootNodes.push(numberNode);
	} else {
		currentNode.appendChild(numberNode);
	}

	return rootNodes;
}

// OBSOLETE
export function displayOutput(num: INumberPiece, options: IOptions): string {

	let output = '';

	let closeColor: boolean = false;
	if (options.numberColor !== '') {
		output += '{\\color{' + options.numberColor + '}';
		closeColor = true;
	} else if (options.color !== '') {
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