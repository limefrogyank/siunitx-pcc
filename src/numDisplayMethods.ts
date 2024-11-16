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

function displayUncertaintyPlusMinusMml(uncertainty: IUncertainty, parser: TexParser, options: INumOutputOptions): MmlNode {
	const numberNode = displayNumberMml(uncertainty, parser, options as IOptions);
	const plusMinusNode = parser.create('token', 'mo', {}, '\u00b1'); // plus-minus sign 
	const mrow = parser.create('node', 'mrow', [plusMinusNode, numberNode], { 'data-siunitx-uncertainty': true });
	return mrow;
}

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
		} else {

			if (options["tight-spacing"]) {
				exponentProductNode.attributes.set('lspace', '0em');
				exponentProductNode.attributes.set('rspace', '0em');
			}
			const exponential = parser.create('node', 'msup', [exponentBaseNode, zeroNode]);
			// Edge case \num[print-unity-mantissa = false, print-zero-exponent = true]{1e0}  
			// as this should resolve to 10^0 without mantissa and exponent marker
			if (options["print-unity-mantissa"]) {
				root.appendChild(exponentProductNode);
			}
			root.appendChild(exponential);
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
			root.appendChild(exponential);
		} else {
			if (num.exponentMarker !== '') {
				if (options["output-exponent-marker"] !== '') {
					const customExponentMarker = (new TexParser(options["output-exponent-marker"], parser.stack.env, parser.configuration)).mml();
					root.appendChild(customExponentMarker);
					root.appendChild(supPart);
				} else {
					if (num.whole !== '' || num.fractional !== '') {
						if (options["tight-spacing"]) {
							exponentProductNode.attributes.set('lspace', '0em');
							exponentProductNode.attributes.set('rspace', '0em');
						}
						root.appendChild(exponentProductNode);
					}
					root.appendChild(exponential);
				}
			}
		}
	}
	return root;
}

export function displayNumberMml(num: INumberPiece, parser: TexParser, options: IOptions): MmlNode {
	const rootNode: MmlNode = parser.create('node', 'mrow');
	if (num.sign === '-' && options["negative-color"]) {
		rootNode.attributes.set('mathcolor', options["negative-color"]);
	}

	groupNumbersMap.get(options["group-digits"])?.(parser, num, options);
	if (options["bracket-negative-numbers"]) {
		if (num.sign === '-') {
			const leftBracket = parser.create('token', 'mo', {}, '(');
			rootNode.appendChild(leftBracket);
		}
	}

	if (num.sign || options["print-implicit-plus"]) {
		const sign = parser.create('token', 'mo', { rspace: "0em", lspace: "0em" }, num.sign || '+');
		rootNode.appendChild(sign);
	}

	let numberString = '';
	let trailingMml: MmlNode;
	// if unity mantissa AND don't print it, then we don't need the rest of this.
	if (num.whole === '1' && num.fractional === '' && !options["print-unity-mantissa"]) {
		// don't do anything UNLESS exponent is also zero and printZeroExponent is false
		if (!options["print-zero-exponent"] && (num.exponent === '' || (num.exponent === '0' && num.exponentSign !== '-'))) {
			numberString += '1';
		}
	} else {
		if ((num.whole === '' && num.fractional) || +num.whole === 0) {
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
	rootNode.appendChild(numberNode);
	if (trailingMml !== undefined) {
		rootNode.appendChild(trailingMml);
	}
	// display uncertanties (if not null)
	num.uncertainty?.forEach(v => {
		const uncertaintyNode = uncertaintyModeMmlMapping.get(options["uncertainty-mode"])?.(v, num, parser, options);
		rootNode.appendChild(uncertaintyNode);
	});

	const exponentNode = createExponentMml(num, parser, options);
	rootNode.appendChild(exponentNode);


	if (options["bracket-negative-numbers"]) {
		if (num.sign === '-') {
			const rightBracket = parser.create('token', 'mo', {}, ')');
			rootNode.appendChild(rightBracket);
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
