import TexParser from "mathjax-full/js/input/tex/TexParser";
import { INumberPiece, IUncertainty } from "./numMethods";
import { IOptions } from "./options/options";
import { INumOutputOptions } from "./options/numberOptions";
import { AbstractMmlTokenNode, MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";

const spaceMap: Record<string, string> = {
	'1em': '\u2001',
	'2em': '\u2001\u2001',
	'0.167em': '\u2006',
	'0.222em': '\u2005',  // U+2005 is actually .25em
	'0.278em': '\u2004',  // U+2004 is actually .333em
	// include no leading zero versions just in case...
	'.167em': '\u2006',
	'.222em': '\u2005',  // U+2005 is actually .25em
	'.278em': '\u2004',  // U+2004 is actually .333em
	//U+2009 is font dependent, so not reliable
};

export function findInnerText(node: MmlNode): string {
	const data = { text: '' };
	node.walkTree((node: MmlNode, data: { text: string }) => {
		if (!node.isToken) return;
		if (node.isKind('mspace')) {
			
			const w = node.attributes.getExplicit('width');
			if (Object.prototype.hasOwnProperty.call(spaceMap, w)) {
				data.text += spaceMap[w as string];
			}
		} else {
			data.text += (node as AbstractMmlTokenNode).getText();
		}

	}, data);
	return data.text;
}

function addSpacing(
	parser: TexParser,
	text: string,
	digitGroupSize: number,
	minimum: number,
	spacer: string,
	reverse: boolean,
	digitGroupFirstSize: number,
	digitGroupOtherSize: number
) {
	// parse the latex space, extract the em spacing, and lookup the proper unicode space
	const spacerNode = (new TexParser(spacer, parser.stack.env, parser.configuration)).mml();
	const mmlSpacer = findInnerText(spacerNode);

	// do not use text.split('') as that won't work with 32-bit unicode characters.
	const digits = [...text];
	if (digits.length >= minimum) {
		const firstSize = (digitGroupFirstSize !== -1 ? digitGroupFirstSize : digitGroupSize);
		const groupSize = (digitGroupOtherSize !== -1 ? digitGroupOtherSize : digitGroupSize);
		const [start, size] = (reverse ? [firstSize, groupSize + 1] : [digits.length - firstSize, -groupSize]);
		for (let i = start; i >= 0 && i < digits.length; i += size) {
			digits.splice(i, 0, mmlSpacer);
		}
	}
	return digits.join('');
}


const groupNumbersMap = new Map<string, (parser: TexParser, num: INumberPiece, options: INumOutputOptions) => void>([
	['all', (parser: TexParser, num: INumberPiece, options: INumOutputOptions): void => {
		num.whole = addSpacing(parser, num.whole, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], false, options["digit-group-first-size"], options["digit-group-other-size"]);
		num.fractional = addSpacing(parser, num.fractional, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], true, options["digit-group-first-size"], options["digit-group-other-size"]);

	}],
	['decimal', (parser: TexParser, num: INumberPiece, options: INumOutputOptions): void => {
		num.fractional = addSpacing(parser, num.fractional, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], true, options["digit-group-first-size"], options["digit-group-other-size"]);

	}],
	['integer', (parser: TexParser, num: INumberPiece, options: INumOutputOptions): void => {
		num.whole = addSpacing(parser, num.whole, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], false, options["digit-group-first-size"], options["digit-group-other-size"]);
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

// // Deprecated
// function displayUncertaintyBracket(uncertainty: IUncertainty, options: INumOutputOptions): string {
// 	let output = options["uncertainty-separator"];
// 	output += options["output-open-uncertainty"];
// 	output += uncertainty.whole;
// 	output += (options["uncertainty-mode"] === 'compact-marker' || options["uncertainty-mode"] === 'full') && uncertainty.decimal !== '' ? options["output-decimal-marker"] : '';
// 	output += uncertainty.fractional;
// 	output += options["output-close-uncertainty"];
// 	return output;
// }

function displayUncertaintyBracketMml(uncertainty: IUncertainty, parser: TexParser, options: INumOutputOptions): MmlNode {
	const uncertaintySeparator = (new TexParser(options["uncertainty-separator"], parser.stack.env, parser.configuration)).mml();
	const openUncertainty = (new TexParser(options["output-open-uncertainty"], parser.stack.env, parser.configuration)).mml();

	let number = uncertainty.whole;
	number += (options["uncertainty-mode"] === 'compact-marker' || options["uncertainty-mode"] === 'full') && uncertainty.decimal !== '' ? options["output-decimal-marker"] : '';
	number += uncertainty.fractional;
	const numberNode = parser.create('token', 'mn', {}, number);
	const closeUncertainty = (new TexParser(options["output-close-uncertainty"], parser.stack.env, parser.configuration)).mml();
	const mrow = parser.create('node', 'mrow', [uncertaintySeparator, openUncertainty, numberNode, closeUncertainty]);
	return mrow;
}

// // Deprecated
// function displayUncertaintyPlusMinus(uncertainty: IUncertainty, options: INumOutputOptions): string {
// 	return '\\pm' + displayNumber(uncertainty, options);
// }

function displayUncertaintyPlusMinusMml(uncertainty: IUncertainty, parser: TexParser, options: INumOutputOptions): MmlNode {
	const numberNode = displayNumberMml(uncertainty, parser, options as IOptions);
	const plusMinusNode = parser.create('token', 'mo', {}, '\u00b1'); // plus-minus sign 
	const mrow = parser.create('node', 'mrow', [plusMinusNode, numberNode], { 'data-siunitx-uncertainty': true });
	return mrow;
}

// // Deprecated
// const uncertaintyModeMapping = new Map<string, (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions) => string>([
// 	['separate', (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions): string => {
// 		convertUncertaintyToPlusMinus(uncertainty, value, options);
// 		return displayUncertaintyPlusMinus(uncertainty, options);
// 	}],
// 	['compact', (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions): string => {
// 		convertUncertaintyToBracket(uncertainty, value, options);
// 		return displayUncertaintyBracket(uncertainty, options);
// 	}],
// 	['full', (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions): string => {
// 		convertUncertaintyToBracket(uncertainty, value, options);
// 		return displayUncertaintyBracket(uncertainty, options);
// 	}],
// 	['compact-marker', (uncertainty: IUncertainty, value: INumberPiece, options: INumOutputOptions): string => {
// 		convertUncertaintyToBracket(uncertainty, value, options);
// 		return displayUncertaintyBracket(uncertainty, options);
// 	}],
// ])

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


// export function displayNumber(piece: INumberPiece, options: INumOutputOptions): string {
// 	let output = '';
// 	let mmlString = '';
// 	groupNumbersMap.get(options["group-digits"])?.(piece, options);

// 	if (options["negative-color"] !== '') {
// 		output += '{\\color{' + options["negative-color"] + '}';
// 	}
// 	if (options["bracket-negative-numbers"]) {
// 		if (piece.sign === '-') {
// 			output += '(';
// 		}
// 	} else {
// 		// brackets remove extra spacing intended for math equation
// 		if (options["print-implicit-plus"] && piece.sign === '') {
// 			//output += '\\mmlToken{mrow}{\\mmlToken{mo}{+}}';
// 			output += '\\mmlToken{mo}[rspace="0em", lspace="0em"]{+}';
// 		} else {
// 			if (piece.sign !== '') {
// 				//output += `\\mmlToken{mrow}{\\mmlToken{mo}{${piece.sign}}}`;
// 				output += `\\mmlToken{mo}[rspace="0em", lspace="0em"]{${piece.sign}}`;
// 			}
// 		}
// 	}

// 	// if unity mantissa AND don't print it, then we don't need the rest of this.
// 	if (piece.whole === '1' && piece.fractional === '' && !options["print-unity-mantissa"]) {
// 		// don't do anything UNLESS exponent is also zero and printZeroExponent is false
// 		if (!options["print-zero-exponent"] && (piece.exponent === '' || (piece.exponent === '1' && piece.exponentSign !== '-'))) {
// 			mmlString += '1';
// 		}
// 	} else {
// 		if ((piece.whole === '' && piece.fractional) || piece.whole === '0') {
// 			if (options["print-zero-integer"]) {
// 				mmlString += '0';
// 			}
// 		} else {
// 			mmlString += piece.whole;
// 		}
// 		mmlString += (piece.decimal !== '' ? options["output-decimal-marker"] : '');
// 		if (options["zero-decimal-as-symbol"] && +(piece.fractional) === 0) {
// 			// hack: insert searchable identifier
// 			mmlString += options["zero-symbol"];
// 		} else {
// 			mmlString += piece.fractional;
// 		}
// 	}

// 	output += `\\mmlToken{mn}{${mmlString}}`;
// 	mmlString = '';

// 	// display uncertanties (if not null)
// 	piece.uncertainty?.forEach(v => {
// 		output += uncertaintyModeMapping.get(options["uncertainty-mode"])?.(v, piece, options);
// 	});

// 	if (options["print-zero-exponent"] && (piece.exponent === '' || (piece.exponent === '0'))) {
// 		if (options["output-exponent-marker"] !== '') {
// 			output += options["output-exponent-marker"];
// 			output += '0';
// 		} else {
// 			if (options["tight-spacing"]) {
// 				output += '{' + options["exponent-product"] + '}';
// 			} else {
// 				output += options["exponent-product"];
// 			}
// 			output += options["exponent-base"];
// 			output += '^{0}';
// 		}
// 	} else if (piece.exponent !== '' && piece.exponent !== '0') {
// 		// if unity mantissa AND don't print it, then can't print exponentMarkers (E) nor exponentProduct (\\times)
// 		if (piece.whole === '1' && piece.fractional === '' && !options["print-unity-mantissa"]) {
// 			output += options["exponent-base"];
// 			output += '^{' + piece.exponentSign + piece.exponent + '}';
// 		} else {
// 			if (piece.exponentMarker !== '') {
// 				if (options["output-exponent-marker"] !== '') {
// 					output += options["output-exponent-marker"];
// 					output += piece.exponentSign + piece.exponent;
// 				} else {
// 					if (options["tight-spacing"]) {
// 						output += (piece.whole !== '' || piece.fractional !== '') ? '{' + options["exponent-product"] + '}' : '';
// 					} else {
// 						output += (piece.whole !== '' || piece.fractional !== '') ? options["exponent-product"] : '';
// 					}
// 					output += options["exponent-base"];
// 					output += '^{' + piece.exponentSign + piece.exponent + '}';
// 				}
// 			}
// 		}
// 	}

// 	if (options["bracket-negative-numbers"]) {
// 		if (piece.sign === '-') {
// 			output += ')';
// 		}
// 	}
// 	if (options["negative-color"] !== '') {
// 		output += '}';
// 	}

// 	return output;
// }

export function createExponentMml(num: INumberPiece, parser: TexParser, options: IOptions): MmlNode {
	const root = parser.create('node', 'inferredMrow', [], {});
	const exponentProductNode = (new TexParser(options["exponent-product"], parser.stack.env, parser.configuration)).mml();
	const exponentBaseNode = (new TexParser(options["exponent-base"], parser.stack.env, parser.configuration)).mml();
	if (options["print-zero-exponent"] && (num.exponent === '' || (num.exponent === '0'))) {
		const zeroNode = parser.create('token', 'mn', {}, '0');
		if (options["output-exponent-marker"] !== '') {
			const customExponentMarker = parser.create('token', 'mi', { mathvariant: 'normal' }, options["output-exponent-marker"]);
			root.appendChild(customExponentMarker);
			root.appendChild(zeroNode);
			//currentNode.appendChild(customExponentMarker);
			//currentNode.appendChild(zeroNode);
		} else {
			if (options["tight-spacing"]) {
				exponentProductNode.attributes.set('lspace', '0em');
				exponentProductNode.attributes.set('rspace', '0em');
			}
			const exponential = parser.create('node', 'msup', [exponentBaseNode, zeroNode]);
			root.appendChild(exponentProductNode);
			root.appendChild(exponential);
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
			root.appendChild(exponential);
		} else {
			if (num.exponentMarker !== '') {
				if (options["output-exponent-marker"] !== '') {
					const customExponentMarker = (new TexParser(options["output-exponent-marker"], parser.stack.env, parser.configuration)).mml();
					//const customExponentMarker = parser.create('token', 'mi', { }, options.outputExponentMarker);
					root.appendChild(customExponentMarker);
					root.appendChild(supPart);
					// currentNode.appendChild(customExponentMarker);
					// currentNode.appendChild(supPart);
				} else {
					if (num.whole !== '' || num.fractional !== '') {
						if (options["tight-spacing"]) {
							exponentProductNode.attributes.set('lspace', '0em');
							exponentProductNode.attributes.set('rspace', '0em');
						}
						root.appendChild(exponentProductNode);
						// currentNode.appendChild(exponentProductNode);
					}
					root.appendChild(exponential);
					// currentNode.appendChild(exponential);
				}
			}
		}
	}
	return root;
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

	groupNumbersMap.get(options["group-digits"])?.(parser, num, options);
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
			trailingMml = (new TexParser(options["zero-symbol"], parser.stack.env, parser.configuration)).mml();
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

	const exponentNode = createExponentMml(num, parser, options);
	currentNode.appendChild(exponentNode);


	if (options["bracket-negative-numbers"]) {
		if (num.sign === '-') {
			const rightBracket = parser.create('token', 'mo', {}, ')');
			currentNode.appendChild(rightBracket);
		}
	}
	return rootNode;
}

export function displayOutputMml(num: INumberPiece, parser: TexParser, options: IOptions): MmlNode {
	const color = options["number-color"] || options.color;
	const rootNode = parser.create('node', color ? 'mrow' : 'inferredMrow', [], color ? { mathcolor: color } : {});
	if (num.prefix !== '') {
		const prefix = (new TexParser('{' + num.prefix + '}', parser.stack.env, parser.configuration)).mml();
		rootNode.appendChild(prefix);
	}
	rootNode.appendChild(displayNumberMml(num, parser, options));
	return rootNode;
}

// // OBSOLETE
// export function displayOutput(num: INumberPiece, options: IOptions): string {

// 	let output = '';

// 	let closeColor: boolean = false;
// 	if (options.numberColor !== '') {
// 		output += '{\\color{' + options.numberColor + '}';
// 		closeColor = true;
// 	} else if (options.color !== '') {
// 		output += '{\\color{' + options.color + '}';
// 		closeColor = true;
// 	}

// 	// display any prefix symbol such as less than, greater than, etc.
// 	// brackets will remove the extra space that normally occurs with symbol
// 	output += '{' + num.prefix + '}';

// 	// display main number
// 	output += displayNumber(num, options);

// 	if (closeColor) {
// 		output += '}';
// 	}

// 	return output;
// }