import TexParser from "mathjax-full/js/input/tex/TexParser";
import { displayOutputMml, findInnerText } from "./numDisplayMethods";
import { INumberPiece, parseNumber } from "./numMethods";
import { convertToFixed, postProcessNumber } from "./numPostProcessMethods";
import { findOptions, IOptions } from "./options/options";
import { IQuantityOptions, PrefixMode, SeparateUncertaintyUnits } from "./options/quantityOptions";
import { displayUnits, IUnitPiece, parseUnit } from "./unitMethods";
import { prefixPower } from "./units";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";

function combineExponent(parser: TexParser, num: INumberPiece, units: IUnitPiece[], options: IQuantityOptions): void {
	if (!num.exponent || (!units || units.length === 0)) {
		return;
	}

	const exponent = +(num.exponentSign + num.exponent);
	let targetExponent: number;
	for (const power of prefixPower.values()) {
		if (power >= exponent) {
			targetExponent = power;
		} else {
			break;
		}
	}

	const firstUnit = units[0];
	// prefix can be undefined, empty, or string... this specifically checks for empty
	if (firstUnit.prefix !== '') {
		const unitPower = (firstUnit.power !== null ? +(firstUnit.power) : 1) * (firstUnit.position === 'denominator' ? -1 : 1);
		const addedPower = firstUnit.prefix ? prefixPower.get(firstUnit.prefix) : 1;
		targetExponent += addedPower * unitPower;
		// just in case prefix was cm (2) and we added 3, there's no prefix for 5
		while (!prefixPower.revHas(targetExponent)) {
			targetExponent++;
		}
	}
	// set new prefix
	//console.log(JSON.parse(JSON.stringify(units)));
	//console.log(targetExponent);
	firstUnit.prefix = prefixPower.revGet(targetExponent);
	//console.log(firstUnit.prefix);
	//console.log(JSON.parse(JSON.stringify(units)));
	const newExponent = targetExponent - exponent;
	num.exponent = (Math.abs(newExponent)).toString();
	num.exponentSign = Math.sign(newExponent) > 0 ? '' : '-';
	convertToFixed(parser, num, options);
}

function extractExponent(parser: TexParser, num: INumberPiece, units: IUnitPiece[], options: IQuantityOptions): void {
	if (units === null) {
		return;
	}
	let powersOfTen = 0;
	//let powersOfTwo = 0;

	for (let i = 0; i < units.length; i++) {
		const unit = units[i];
		// run only if 
		// 1. prefix is present for all units except grams
		// 2. prefix is present for grams when !extractMassInKilograms
		// 2. prefix is not k for grams when extractMassInKilograms // special case

		if ((unit.symbol !== 'g' && unit.prefix !== '') || (unit.symbol === 'g' && unit.prefix !== '' && !options["extract-mass-in-kilograms"])) {
			const unitPower = ((unit.power !== undefined && unit.power !== null) ? +(unit.power) : 1) * (unit.position === 'denominator' ? -1 : 1);
			// if (binaryPrefixPower.has(unit.prefix)){
			// 	const prefPower = binaryPrefixPower.get(unit.prefix);
			// 	powersOfTwo += (prefPower*unitPower);
			// } else {
			if (prefixPower.has(unit.prefix)) {
				const prefPower = prefixPower.get(unit.prefix);
				powersOfTen += (prefPower * unitPower);
			} else {
				// Don't do anything to this prefix.  Can't convert it. Next unit...
				continue;
			}
			unit.prefix = '';
		} else if (unit.symbol === 'g' && unit.prefix !== 'k' && options["extract-mass-in-kilograms"]) {
			const unitPower = ((unit.power !== undefined && unit.power !== null) ? +(unit.power) : 1) * (unit.position === 'denominator' ? -1 : 1);
			if (prefixPower.has(unit.prefix)) {
				const prefPower = prefixPower.get(unit.prefix);
				powersOfTen += (prefPower * unitPower) - 3;
			} else {
				// this unit has no prefix...
				powersOfTen = -3;
			}
			unit.prefix = 'k';
		}
	}
	const currentExponent = (num.exponent !== '' ? +(num.exponentSign + num.exponent) : 0);
	const newExponent = currentExponent + powersOfTen;
	num.exponent = Math.abs(newExponent).toString();
	num.exponentSign = Math.sign(newExponent) > 0 ? '' : '-';
	if (!num.exponentMarker) {
		num.exponentMarker = 'e';
	}
}

export const prefixModeMap = new Map<PrefixMode, (parser: TexParser, num: INumberPiece, units: IUnitPiece[], options: IQuantityOptions) => void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['input', (): void => { }],
	['combine-exponent', combineExponent],
	['extract-exponent', extractExponent]
]);

function findUncertaintyNode(root: MmlNode): MmlNode | null {
	for (const x of root.childNodes) {
		const mmlNode = x as MmlNode;
		if (mmlNode) {
			if (mmlNode.attributes !== null) {
				const names = mmlNode.attributes.getExplicitNames();
				if (names.indexOf('data-siunitx-uncertainty') !== -1) {
					return mmlNode;
				}
			}
			const result = findUncertaintyNode(mmlNode);
			if (result !== null) {
				return result;
			}
		}
	}
	return null;
}

const separateUncertaintyUnitsMmlMap = new Map<SeparateUncertaintyUnits, (num: MmlNode, units: MmlNode, quantityProduct: MmlNode, parser: TexParser, options: IQuantityOptions) => MmlNode>([
	['single', (num: MmlNode, units: MmlNode, quantityProduct: MmlNode, parser: TexParser, _options: IQuantityOptions): MmlNode => {
		const root = parser.create('node', 'inferredMrow', [], {});
		root.appendChild(num);
		root.appendChild(quantityProduct);
		root.appendChild(units);
		return root;
	}],
	['bracket', (num: MmlNode, units: MmlNode, quantityProduct: MmlNode, parser: TexParser, options: IQuantityOptions): MmlNode => {
		const root = parser.create('node', 'inferredMrow', [], {});
		let uncertaintyNode: MmlNode = null;
		for (const x of num.childNodes) {
			const result = findUncertaintyNode(x as MmlNode);
			if (result !== null) {
				uncertaintyNode = result;
				break;
			}
		}

		if (uncertaintyNode !== null) {
			const leftBracket = parser.create('token', 'mo', {}, options["output-open-uncertainty"]);
			const rightBracket = parser.create('token', 'mo', {}, options["output-close-uncertainty"]);
			root.appendChild(leftBracket);
			root.appendChild(num);
			root.appendChild(rightBracket);
			root.appendChild(quantityProduct);
			root.appendChild(units);
			return root;

		} else {
			root.appendChild(num);
			root.appendChild(quantityProduct);
			root.appendChild(units);
			return root;
		}
	}],
	['repeat', (num: MmlNode, units: MmlNode, quantityProduct: MmlNode, parser: TexParser, _options: IQuantityOptions): MmlNode => {
		let uncertaintyNode: MmlNode = null;
		for (const x of num.childNodes) {
			const result = findUncertaintyNode(x as MmlNode);
			if (result !== null) {
				uncertaintyNode = result;
				break;
			}
		}
		if (uncertaintyNode !== null) {
			const parent = uncertaintyNode.parent;
			const uncertaintyPosition = parent.childNodes.indexOf(uncertaintyNode);
			if (!quantityProduct) {

				parent.childNodes.splice(uncertaintyPosition, 0, units);
				parent.appendChild(units);
			} else {

				parent.childNodes.splice(uncertaintyPosition, 0, quantityProduct, units);

				// To make it match the MathML structure of the previous insert,
				// we should insert the 2nd unit at the same depth.
				// However, SRE seems to rearrange it all anyways.

				parent.appendChild(quantityProduct);
				parent.appendChild(units);

			}
			return num;

		} else {
			const root = parser.create('node', 'inferredMrow', [], {});
			root.appendChild(num);
			root.appendChild(quantityProduct);
			root.appendChild(units);
			return root;
		}
	}]
]);

const separateUncertaintyUnitsMap = new Map<SeparateUncertaintyUnits, (num: string, units: string, options: IQuantityOptions) => string>([
	['single', (num: string, units: string, options: IQuantityOptions): string => {
		return num + options["quantity-product"] + units;
	}],
	['bracket', (num: string, units: string, options: IQuantityOptions): string => {
		if (num.indexOf('\\pm') === -1) {
			return num + options["quantity-product"] + units;
		}
		return options["output-open-uncertainty"] + num + options["output-close-uncertainty"] + options["quantity-product"] + units;
	}],
	['repeat', (num: string, units: string, options: IQuantityOptions): string => {
		// split the num from the uncertainty, split on \\pm
		const split = num.split('\\pm');
		let separate = '';
		for (let i = 0; i < split.length; i++) {
			if (separate !== '') {
				separate += '\\pm';
			}
			separate += split[i];
			separate += options["quantity-product"];
			separate += units;
		}
		return separate;
	}]
]);

export function createQuantityProductMml(parser: TexParser, options: IOptions): MmlNode | null {
	let quantityProductNode = null;

	const trimmedQuantityProduct = options["quantity-product"].trimStart();
	if (trimmedQuantityProduct) {
		const spacerNode = (new TexParser(trimmedQuantityProduct, parser.stack.env, parser.configuration)).mml();
		const spacerUnicode = findInnerText(spacerNode);
		quantityProductNode = parser.create('token', 'mo', {}, spacerUnicode);
	} else {
		quantityProductNode = parser.create('token', 'mo', {} );
	}
	return quantityProductNode;
}

export function processQuantity(parser: TexParser): void {
	let globalOptions: IOptions = { ...parser.options.siunitx as IOptions };

	const localOptions = findOptions(parser, globalOptions);

	let numString = parser.GetArgument('num');
	const unitString = parser.GetArgument('unit');


	let unitDisplay = '';

	const isLiteral = (unitString.indexOf('\\') === -1);
	const unitPieces = parseUnit(parser, unitString, globalOptions, localOptions, isLiteral);

	if (globalOptions["parse-numbers"]) {

		// going to assume evaluate expression is processed first, THEN the result is parsed normally
		if (globalOptions["evaluate-expression"]) {
			// TODO Sanitize Evaluate Expression!
			let expression = globalOptions.expression
			expression = expression.replace('#1', numString);
			numString = eval(expression).toString();
		}

		// refresh global options from default
		globalOptions = { ...parser.options.siunitx as IOptions };
		//processOptions(globalOptions, localOptionString);
		//const options = processOptions(globalOptions, localOptions);
		//options.forEach((v, k) => globalOptions[k] = v);
		Object.assign(globalOptions, localOptions);

		const num = parseNumber(parser, numString, globalOptions);

		//console.log(JSON.parse(JSON.stringify(unitPieces)));
		// convert number and unit if necessary
		prefixModeMap.get(globalOptions["prefix-mode"])?.(parser, num, unitPieces, globalOptions);
		//console.log(JSON.parse(JSON.stringify(unitPieces)));

		postProcessNumber(parser, num, globalOptions);

		//console.log(JSON.parse(JSON.stringify(unitPieces)));

		const numDisplay = displayOutputMml(num, parser, globalOptions);

		// Need to process this after number because some options alter unit prefixes
		unitDisplay = displayUnits(parser, unitPieces, globalOptions, isLiteral);
		const unitNode = (new TexParser(unitDisplay, parser.stack.env, parser.configuration)).mml();

		const quantityProductNode = createQuantityProductMml(parser, globalOptions);

		const qtyDisplay = separateUncertaintyUnitsMmlMap.get(globalOptions["separate-uncertainty-units"])(numDisplay, unitNode, quantityProductNode, parser, globalOptions);
		parser.Push(qtyDisplay);

	} else {
		// can't do any conversions with number since processing is off
		const numDisplay = numString;

		// Need to process this after number because some options alter unit prefixes
		unitDisplay = displayUnits(parser, unitPieces, globalOptions, isLiteral);

		const qtyDisplay = separateUncertaintyUnitsMap.get(globalOptions["separate-uncertainty-units"])(numDisplay, unitDisplay, globalOptions);
		const qtyNode = (new TexParser(qtyDisplay, parser.stack.env, parser.configuration)).mml();
		parser.Push(qtyNode);
	}









}