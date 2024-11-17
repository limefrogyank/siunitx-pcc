import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import TexError from "mathjax-full/js/input/tex/TexError";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { displayOutputMml } from "./numDisplayMethods";
import { postProcessNumber } from "./numPostProcessMethods";
import { findOptions, IOptions } from "./options/options";
import { INumOptions, INumParseOptions } from "./options/numberOptions";
import { siunitxError } from "./error/errors";



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

export interface IUncertainty extends INumberPiece {
	type: 'bracket' | 'pm'
	completed: boolean; // mostly for uncertainty
}

export declare type CharNumFunction = (text: string, numPiece: INumberPiece) => void;

export const NumberPieceDefault: INumberPiece = {
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

const UncertaintyDefault: IUncertainty = {
	...NumberPieceDefault,
	type: 'pm',
	completed: false
};

// Can't splat default otherwise array reference gets copied.  Need to construct it freshly.
export function generateNumberPiece(): INumberPiece {
	const piece = { ...NumberPieceDefault };
	piece.uncertainty = new Array<IUncertainty>();
	return piece;
}

export function pieceToNumber(piece: INumberPiece): number {
	let build = piece.sign + piece.whole;
	if (piece.fractional) {
		build += '.' + piece.fractional;
	}
	if (piece.exponent) {
		build += 'e' + piece.exponentSign + piece.exponent;
	}
	try {
		let result = Number.parseFloat(build);
		if (Number.isNaN(result)) {
			result = 0;
		}
		return result;
	} catch {
		return 0;
	}
}

// INumberPiece is built from left to right, so we're always working on the latest part... which could be uncertainty.  So get the last piece.
function getLastNumPiece(numPiece: INumberPiece):INumberPiece{
	if (numPiece.uncertainty.length > 0) {
		return numPiece.uncertainty[numPiece.uncertainty.length - 1];
	} else {
		return numPiece;
	}
}

function parseDigits(text: string, numPiece: INumberPiece) {
	const num = getLastNumPiece(numPiece);
	if (num.exponentMarker) {
		num.exponent += text;
	} else if (num.decimal) {
		num.fractional += text;
	} else {
		num.whole += text;
	}
}

function parseDecimals(text: string, numPiece: INumberPiece) {
	const num = getLastNumPiece(numPiece);
	num.decimal += text;
}

function parseComparators(text: string, numPiece: INumberPiece) {
	const num = getLastNumPiece(numPiece);

	if (num.prefix){
		throw siunitxError.ComparatorAlreadySet(num.prefix, text);
	}
	num.prefix += text;

}

function parseExponentMarkers(text: string, numPiece: INumberPiece) {
	//let numPiece: INumberPiece;
	// if (numPiece.uncertainty.length > 0){
	// 	num = numPiece.uncertainty[numPiece.uncertainty.length-1];
	// } else {
	// 	num = numPiece;
	// }
	numPiece.exponentMarker += text;
}

function parseSigns(text: string, numPiece: INumberPiece) {
	const num = getLastNumPiece(numPiece);
	if (num.exponentMarker) {
		num.exponentSign += text;
	} else {
		num.sign += text;
	}
}

function parseOpenUncertainty(text: string, numPiece: INumberPiece) {
	const uncertainty: IUncertainty = { ...UncertaintyDefault, type: 'bracket' };
	numPiece.uncertainty.push(uncertainty);
}

function parseCloseUncertainty(text: string, numPiece: INumberPiece) {
	if (numPiece.uncertainty.length === 0) {
		throw new TexError('50', 'Trying to close an uncertainty that doesn\'t exist.');
	}
	const uncertainty = numPiece.uncertainty[numPiece.uncertainty.length - 1];
	if (uncertainty.completed) {
		throw new TexError('51', 'Uncertainty was already closed.');
	}
	uncertainty.completed = true;
}

function parseUncertaintySigns(text: string, numPiece: INumberPiece) {
	const uncertainty: IUncertainty = { ...UncertaintyDefault, type: 'pm' };
	numPiece.uncertainty.push(uncertainty);
}

function parseIgnore() {
	// do nothing
}

// using two types for output.  Ex.  \\pm is used both as sign and as an uncertainty.  Need map of map for this one.
export function generateNumberMapping(options: INumParseOptions): Map<string, CharNumFunction> {
	const parseMap = new Map<string, CharNumFunction>();
	const matchMacrosOrChar = /\\(?:[a-zA-Z]+|[\uD800-\uDBFF].|.)|[\uD800-\uDBFF].|[^\s\\]/g;
	for (const [key, method] of [
		['input-comparators', parseComparators],
		['input-signs', parseSigns],
		['input-digits', parseDigits],
		['input-decimal-markers', parseDecimals],
		['input-open-uncertainty', parseOpenUncertainty],
		['input-close-uncertainty', parseCloseUncertainty],
		['input-uncertainty-signs', parseUncertaintySigns],
		['input-exponent-markers', parseExponentMarkers],
		['input-ignore', parseIgnore]
	] as [string, CharNumFunction][]) {
		const option = options[key];
		if (option.match(/(?:^|[^\\])(?:\\\\)*\\$/)) {
			throw siunitxError.BadOptionChars(key);
		}
		(option.match(matchMacrosOrChar) || []).forEach((c: string) => {
			if (parseMap.has(c) && key === 'input-uncertainty-signs') {
				const inputSigns = parseMap.get(c) as CharNumFunction;
				const altMethod: CharNumFunction = function (macro, num) {
					(num.whole === '' && num.decimal === '' ? inputSigns : parseUncertaintySigns)(macro, num);
				}
				parseMap.set(c, altMethod);
			} else {
				parseMap.set(c, method);
			}
		});
	}
	return parseMap;
}


export function parseNumber(parser: TexParser, text: string, options: INumOptions): INumberPiece {
	const mapping = generateNumberMapping(options);
	text = text.replace('<<', '\\ll')
		.replace('>>', '\\gg')
		.replace('<=', '\\le')
		.replace('>=', '\\ge')
		.replace('+-', '\\pm');

	const num: INumberPiece = generateNumberPiece();

	const subParser = new TexParser(text, parser.stack.env, parser.configuration);
	subParser.i = 0;
	// process character
	// if '\', then read until next '\' or whitespace char

	let token;
	while (subParser.i < subParser.string.length) {
		token = subParser.GetNext();
		subParser.i++;  // GetNext() does not advance position unless skipping whitespace

		if (token === '\\') {
			token += subParser.GetCS();
		}

		try {
			mapping.get(token)(token, num);
		} catch {
			throw siunitxError.InvalidNumArgument(subParser.string);
		}

	}

	if (!options["retain-explicit-decimal-marker"] && num.decimal && !num.fractional) {
		num.decimal = '';
	}
	if (!options["retain-explicit-plus"] && num.sign === '+') {
		num.sign = '';
	}
	// adding exponent to value check here.  Without it, exponentials without a base won't stay negative. (-e10)
	const value = +(num.whole + (num.decimal ? '.' : '') + num.fractional + (num.exponent === '' ? '' : 'e' + num.exponentSign + num.exponent));
	if (value === 0 && !options["retain-negative-zero"] && num.sign === '-') {
		num.sign = '';
	}

	if (!options["retain-zero-uncertainty"]) {
		for (let i = num.uncertainty.length - 1; i >= 0; i--) {
			const uncertaintyValue = +(num.uncertainty[i].whole + (num.uncertainty[i].decimal ? '.' : '') + num.uncertainty[i].fractional);
			if (uncertaintyValue === 0) {
				num.uncertainty.splice(i, 1);
			}
		}
	}

	return num;
}

export function processNumber(parser: TexParser): MmlNode {
	const globalOptions: IOptions = { ...parser.options.siunitx as IOptions };

	const localOptions = findOptions(parser, globalOptions);

	Object.assign(globalOptions, localOptions);

	let text = parser.GetArgument('num');

	if (globalOptions["parse-numbers"]) {

		// going to assume evaluate expression is processed first, THEN the result is parsed normally
		if (globalOptions["evaluate-expression"]) {
			// TODO Sanitize Evaluate Expression!
			let expression = globalOptions.expression
			expression = expression.replace('#1', text);
			text = eval(expression).toString();
		}
		const num = parseNumber(parser, text, globalOptions);

		postProcessNumber(parser, num, globalOptions);
		//const displayResult = displayOutput(num, globalOptions);

		const mmlNode = displayOutputMml(num, parser, globalOptions);

		//const mml = (new TexParser(displayResult, parser.stack.env, parser.configuration)).mml();
		return mmlNode;

	} else {
		const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
		return mml;
	}

}
