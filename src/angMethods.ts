import { MmlNode, TextNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { siunitxError } from "./error/errors";
import { displayNumberMml } from "./numDisplayMethods";
import { generateNumberMapping, generateNumberPiece, INumberPiece } from "./numMethods";
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
	let token;
	while (subParser.i < subParser.string.length) {
		token = subParser.GetNext();
		subParser.i++; // GetNext() does not advance position unless skipping whitespace

		if (token === ';'){
			if (!ang.minutes) {
				ang.minutes = generateNumberPiece();
				num = ang.minutes;
			} else if (!ang.seconds) {
				ang.seconds = generateNumberPiece();
				num = ang.seconds;
			} else {
				throw siunitxError.ExtraSemicolon;
			}
		} else {

			if (token === '\\') {
				token += subParser.GetCS();
			}

			try {
				mapping.get(token)(token, num);
			} catch {
				throw siunitxError.InvalidAngArgument(subParser.string);
			}
		}
	}

	// copied directly from parseNumber, this can be applied to degrees only most likely?
	// TODO: This duplicates some code... clean up?

	if (!options["retain-explicit-decimal-marker"] && ang.degrees.decimal !== '' && ang.degrees.fractional === '') {
		ang.degrees.decimal = '';
	}
	if (!options["retain-explicit-plus"] && ang.degrees.sign === '+') {
		ang.degrees.sign = '';
	}
	const value = +(ang.degrees.whole + (ang.degrees.decimal !== '' ? '.' : '') + ang.degrees.fractional);
	if (value === 0 && !options["retain-negative-zero"] && ang.degrees.sign === '-') {
		ang.degrees.sign = '';
	}

	return ang;
}

function convertToArc(ang: IAnglePiece): void {
	if (ang.minutes !== null || ang.seconds !== null) {
		// already arc format
		return;
	}

	// This ignores exponents.
	if (ang.degrees.decimal !== '') {
		const firstFraction = +('0.' + ang.degrees.fractional);
		ang.degrees.fractional = '';
		ang.degrees.decimal = '';
		if (firstFraction !== 0) {
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
	if (ang.seconds !== undefined && ang.seconds !== null) {
		value = +ang.seconds.whole / 60;
		ang.seconds = null;
	}
	if (ang.minutes !== undefined && ang.minutes !== null) {
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

function degreeOverDecimal(parser: TexParser, inputNode: MmlNode, symbolToUse: string, options: IOptions, accent: boolean): MmlNode | undefined {
	let degreeNodeToAdd: MmlNode;
	// decimal will be in first mn node
	const mnNodes = inputNode.findNodes('mn');
	
	if (mnNodes && mnNodes.length > 0) {
		const numNode = mnNodes[0];
		const textNode = numNode.childNodes[0] as TextNode;
		const split = textNode.getText().split(options["output-decimal-marker"]);
		if (split.length > 1) {  // does contain decimal
			const replacementNode = parser.create('node', 'inferredMrow', [], {});
			replacementNode.appendChild(parser.create('token', 'mn', {}, split[0]));
			const mover = parser.create('node', 'mover', [], {"accent": accent});
			replacementNode.appendChild(mover);
			mover.appendChild(parser.create('token', 'mo', {}, '.'));
			mover.appendChild((new TexParser('\\class{MathML-Unit}{\\mathrm{' + symbolToUse + '}}', parser.stack.env, parser.configuration)).mml());
			replacementNode.appendChild(parser.create('token', 'mn', {}, split[1]));
			const parent = numNode.parent;
			parent.replaceChild(replacementNode, numNode);
			//console.log(JSON.parse(JSON.stringify(numNode)));
			degreeNodeToAdd = inputNode as MmlNode;
		}
	}
	return degreeNodeToAdd;
}

const modeMapping = new Map<string, (ang: IAnglePiece) => void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['input', (): void => { }], // do nothing
	['arc', convertToArc],
	['decimal', convertToDecimal]
]);

function displayAngleMml(parser: TexParser, ang: IAnglePiece, options: IAngleOptions): MmlNode {
	const root = parser.create('node', 'inferredMrow', [], {});

	const degreeValue = +(ang.degrees.whole + (ang.degrees.decimal !== '' ? '.' : '') + ang.degrees.fractional);
	if (!ang.degrees.whole && options["fill-angle-degrees"]) {
		if (ang.minutes.sign === '-') {
			ang.degrees.sign = '-';
			ang.minutes.sign = '';
		} else if (ang.seconds.sign === '-') {
			ang.degrees.sign = '-';
			ang.seconds.sign = '';
		}
		ang.degrees.whole = '0';
	}
	let degreeNodeToAdd: MmlNode;
	if (degreeValue !== 0 || ang.degrees.whole === '0' || options["fill-angle-degrees"]) {
		const degreeMml = displayNumberMml(ang.degrees, parser, options as IOptions);
		if (options["angle-symbol-over-decimal"]) {
			// TODO: assume no exponents, maybe check for this and thow error
			degreeNodeToAdd = degreeOverDecimal(parser, degreeMml, options["angle-symbol-degree"], options as IOptions, true);
		}
		if (!degreeNodeToAdd) {
			// do nothing but add symbol to end
			degreeNodeToAdd = parser.create('node', 'inferredMrow', [], {});
			degreeNodeToAdd.appendChild(degreeMml);
			degreeNodeToAdd.appendChild((new TexParser(options["number-angle-product"] + '\\class{MathML-Unit}{\\mathrm{' + options["angle-symbol-degree"] + '}}', parser.stack.env, parser.configuration)).mml());

		}
	}

	let minuteNodeToAdd: MmlNode;
	if (ang.minutes !== undefined && ang.minutes !== null) {
		const minutesValue = +(ang.minutes.whole + (ang.minutes.decimal !== '' ? '.' : '') + ang.minutes.fractional);
		let moddedAngleSymbolMinute = '\\mathrm{' + options["angle-symbol-minute"] + '}';
		if (moddedAngleSymbolMinute === "\\mathrm{'}") {
			// TODO: Localize the degree-minutes
			if (minutesValue === 1)
				moddedAngleSymbolMinute = '\\arialabel{degree-minute}{\\degreeminute}';
			else
				moddedAngleSymbolMinute = '\\arialabel{degree-minutes}{\\degreeminute}';
		}

		if (minutesValue !== 0 || ang.minutes.whole === '0' || options["fill-angle-minutes"]) {

			if (minutesValue === 0 && options["fill-angle-minutes"]) {
				if (ang.seconds.sign === '-') {
					ang.minutes.sign = '-';
					ang.seconds.sign = '';
				}
				ang.minutes.whole = '0';
			}
			const minutesMml = displayNumberMml(ang.minutes, parser, options as IOptions);
			if (options["angle-symbol-over-decimal"]) {
				//const number = displayNumber(ang.minutes, options);
				minuteNodeToAdd = degreeOverDecimal(parser, minutesMml, moddedAngleSymbolMinute, options as IOptions, false);
			}

			if (!minuteNodeToAdd) {
				// do nothing but add symbol to end
				minuteNodeToAdd = parser.create('node', 'inferredMrow', [], {});
				minuteNodeToAdd.appendChild(minutesMml);
				minuteNodeToAdd.appendChild((new TexParser(options["number-angle-product"] + '\\class{MathML-Unit}{\\mathrm{' + moddedAngleSymbolMinute + '}}', parser.stack.env, parser.configuration)).mml());
			}
		}
	}

	let secondsNodeToAdd: MmlNode;
	if (ang.seconds !== undefined && ang.seconds !== null) {
		const secondsValue = +(ang.seconds.whole + (ang.seconds.decimal !== '' ? '.' : '') + ang.seconds.fractional);
		let moddedAngleSymbolSecond = '\\mathrm{' + options["angle-symbol-second"] + '}';
		if (moddedAngleSymbolSecond === "\\mathrm{''}") {
			// TODO: Localize the degree-seconds
			if (secondsValue === 1)
				moddedAngleSymbolSecond = '\\arialabel{degree-second}{\\degreesecond}';
			else
				moddedAngleSymbolSecond = '\\arialabel{degree-seconds}{\\degreesecond}';
		}

		if (secondsValue !== 0 || ang.seconds.whole === '0' || options["fill-angle-seconds"]) {
			if (secondsValue === 0 && options["fill-angle-seconds"]) {
				ang.seconds.whole = '0';
			}

			const secondsMml = displayNumberMml(ang.seconds, parser, options as IOptions);
			if (options["angle-symbol-over-decimal"]) {
				//const number = displayNumberMml(ang.seconds, parser, options);
				secondsNodeToAdd = degreeOverDecimal(parser, secondsMml, moddedAngleSymbolSecond, options as IOptions, false);
			}

			if (!secondsNodeToAdd) {
				// do nothing but add symbol to end
				secondsNodeToAdd = parser.create('node', 'inferredMrow', [], {});
				secondsNodeToAdd.appendChild(secondsMml);
				secondsNodeToAdd.appendChild((new TexParser(options["number-angle-product"] + '\\class{MathML-Unit}{\\mathrm{' + moddedAngleSymbolSecond + '}}', parser.stack.env, parser.configuration)).mml());
			}
		}
	}


	if (degreeNodeToAdd) {
		root.appendChild(degreeNodeToAdd);
	}
	if (degreeNodeToAdd && (minuteNodeToAdd || secondsNodeToAdd) && options["angle-separator"] !== '') {
		root.appendChild((new TexParser(options["angle-separator"], parser.stack.env, parser.configuration)).mml());
	}
	if (minuteNodeToAdd){
		root.appendChild(minuteNodeToAdd);
	}
	if (minuteNodeToAdd && secondsNodeToAdd && options["angle-separator"] !== '') {
		root.appendChild((new TexParser(options["angle-separator"], parser.stack.env, parser.configuration)).mml());
	}
	if (secondsNodeToAdd){
		root.appendChild(secondsNodeToAdd);
	}

	return root;
}


export function processAngle(parser: TexParser): MmlNode {

	const globalOptions: IOptions = { ...parser.options.siunitx as IOptions };

	const localOptions = findOptions(parser, globalOptions);

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
	modeMapping.get(globalOptions["angle-mode"])(ang);
	const mml = displayAngleMml( parser, ang, globalOptions);

	return mml;
}