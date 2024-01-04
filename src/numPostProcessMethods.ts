import { siunitxError } from "./error/errors";
import { INumberPiece, parseNumber } from "./numMethods";
import { INumOptions, INumPostOptions } from "./options/numberOptions";
import { IOptions } from "./options/options";

import { GlobalParser } from "./siunitx";

function convertToScientific(numOriginal: INumberPiece, options: INumPostOptions): INumberPiece {
	//convert to actual number and use formating to print scientific
	const num = JSON.parse(JSON.stringify(numOriginal));
	const val = (+(num.sign + num.whole + num.decimal + num.fractional + (num.exponent !== '' ? ('e' + num.exponentSign + num.exponent) : ''))).toExponential();
	// parse that back in
	const newNum = parseNumber(GlobalParser, val, options as IOptions);

	//don't forget to check for trailing zeros and put them back
	let trailingZeros = 0;
	// count trailing zeros in original fractional part
	if (num.fractional !== '') {
		for (let i = num.fractional.length - 1; i >= 0; i--) {
			if (num.fractional[i] === '0') {
				trailingZeros++;
			} else {
				break;
			}
		}
	}
	// count trailing zeros in original whole part (if all of fractional part was zeros)
	if (num.whole !== '' && num.fractional.length === trailingZeros) {
		for (let i = num.whole.length - 1; i >= 0; i--) {
			if (num.whole[i] === '0') {
				trailingZeros++;
			} else {
				break;
			}
		}
	}
	// add the appropriate number of trailing zeros.
	for (let i = 0; i < trailingZeros; i++) {
		newNum.fractional += '0';
	}
	// add a decimal if the original didn't have one, but we need it.
	if (newNum.decimal === '' && trailingZeros > 0) {
		newNum.decimal = '.';
	}
	// copy the new values to the original reference
	for (const prop in num) {
		num[prop] = newNum[prop];
	}
	return num;
}

function convertToExponent(num: INumberPiece, targetExponent: number) {
	if (num === null) return;
	// count difference between target exponent and current one.
	const diff = targetExponent - +(num.exponentSign + num.exponent);
	const dir = Math.sign(diff);  // -: move numbers from frac to whole, +: move the other way
	for (let i = 0; i < Math.abs(diff); i++) {
		if (dir < 0) {
			if (num.fractional.length > 0) {
				num.whole = num.whole + num.fractional.slice(0, 1);
				num.fractional = num.fractional.slice(1, num.fractional.length);
			} else {
				num.whole = num.whole + '0';
			}
		} else {
			if (num.whole.length > 0) {
				num.fractional = num.whole.slice(num.whole.length - 1, num.whole.length) + num.fractional;
				num.whole = num.whole.slice(0, num.whole.length - 1);
			} else {
				num.fractional = '0' + num.fractional;
			}
		}
	}
	if (num.fractional !== '' && num.decimal === '') {
		num.decimal = '.';
	}
	num.exponent = Math.abs(targetExponent).toString();
	num.exponentSign = Math.sign(targetExponent) < 0 ? '-' : '';
}

function convertToEngineering(num: INumberPiece, options: INumPostOptions): void {
	// similar to convertToFixed except we calculate the exponent to be a power of three that keeps the whole number part non-zero.

	// convert to scientific, then move decimal...
	const convertedNum = convertToScientific(num, options);
	Object.assign(num, convertedNum);
	let targetExponent = +(num.exponentSign + num.exponent);
	while (targetExponent % 3 !== 0) {
		targetExponent--;
	}

	convertToExponent(num, targetExponent);
}

export function convertToFixed(num: INumberPiece, options: INumPostOptions): void {
	// convert to scientific, then move decimal...
	const convertedNum = convertToScientific(num, options);
	Object.assign(num, convertedNum);

	convertToExponent(num, options["fixed-exponent"]);
}

const exponentModeMap = new Map<string, (num: INumberPiece, options: INumPostOptions) => void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['input', (): void => { }],  // leave number as-is
	['fixed', convertToFixed],
	['engineering', convertToEngineering],
	['scientific', (num: INumberPiece, options: IOptions) => {
		const convertedNum = convertToScientific(num, options);
		Object.assign(num, convertedNum);
	}],
	['threshold', (num: INumberPiece, options: IOptions) => {
		const minMax = options["exponent-thresholds"].split(':');
		if (minMax.length !== 2) {
			throw siunitxError.ExponentThresholdsError(options["exponent-thresholds"]);
		}
		// ensure we have a version in scientific form but leave the original alone.
		const testNum = convertToScientific(num, options);
		const testExponent = +(testNum.exponentSign + testNum.exponent);
		if (testExponent > +minMax[0] && testExponent < +minMax[1]) {
			//leave number as-is'
		} else {
			// copy the scientific form over to the original INumPiece
			Object.assign(num, testNum);
		}
	}]
]);

function shouldRoundUp(toRound: number, firstDrop: number, roundEven: boolean): boolean {
	let result = false;
	if (firstDrop > 5) {
		result = true;
	} else if (firstDrop === 5) {
		if (roundEven) {
			if (toRound % 2 === 0) {
				result = false;
			} else {
				result = true;
			}
		} else {
			result = true;
		}
	}

	return result;
}

function roundUp(fullNumber: string, position: number): string {
	let result = '';
	const reverseNumArr = new Array<number>();
	let digit = +fullNumber[position] + 1;
	let roundedNine = digit === 0 ? true : false;
	reverseNumArr.push(digit);
	for (let i = position - 1; i >= 0; i--) {
		if (roundedNine) {
			digit = +fullNumber[i] + 1;
			roundedNine = digit === 0 ? true : false;
			reverseNumArr.push(digit);
		} else {
			digit = +fullNumber[i];
			reverseNumArr.push(digit);
		}
	}
	reverseNumArr.reverse();
	reverseNumArr.forEach(v => result += v);
	return result;
}

function roundPlaces(num: INumberPiece, options: INumPostOptions): void {
	// if uncertainty exists, no rounding at all!
	if (num.uncertainty.length === 0) {
		if (num.fractional.length > options["round-precision"]) {
			const firstDrop = +num.fractional.slice(options["round-precision"], options["round-precision"] + 1);
			const toRound = +num.fractional.slice(options["round-precision"] - 1, options["round-precision"]);
			const wholeLength = num.whole === '0' ? 0 : num.whole.length;
			if (shouldRoundUp(toRound, firstDrop, options["round-half"] === 'even')) {
				const result = roundUp((num.whole === '0' ? '' : num.whole) + num.fractional, wholeLength + options["round-precision"] - 1);
				//const wholeLength = num.whole.length;
				num.whole = result.slice(0, wholeLength);
				num.fractional = result.slice(wholeLength, result.length);
			} else {
				num.fractional = num.fractional.slice(0, options["round-precision"]);
			}

		} else if (num.fractional.length < options["round-precision"] && options["round-pad"]) {
			const toAdd = options["round-precision"] - num.fractional.length;
			for (let i = 0; i < toAdd; i++) {
				num.fractional += '0';  // pad with zeros
			}
			if (num.decimal === '') {
				num.decimal = (options as INumOptions)["output-decimal-marker"];
			}
		} else {
			//no rounding needed.
		}

		afterRoundZeroOptions(num, options);

	}
}

function roundFigures(num: INumberPiece, options: INumPostOptions): void {
	// if uncertainty exists, no rounding at all!
	if (num.uncertainty.length === 0) {
		// whole can't be '0', and converting fractional to number and back to string gets rid of leading zeros.
		const combined = num.whole === '0' ? (+num.fractional).toString() : num.whole + (+num.fractional).toString();
		if (combined.length > options["round-precision"]) {
			//console.log(num.whole + num.decimal + num.fractional);
			const firstDrop = +combined.slice(options["round-precision"], options["round-precision"] + 1);
			const toRound = +combined.slice(options["round-precision"] - 1, options["round-precision"]);

			let roundingResult: string;
			// round up or down
			if (shouldRoundUp(toRound, firstDrop, options["round-half"] === 'even')) {
				roundingResult = roundUp(combined, options["round-precision"] - 1);
			} else {
				roundingResult = combined.slice(0, options["round-precision"]);
			}
			// split the result back into whole and fractional parts
			const wholeLength = num.whole === '0' ? 0 : num.whole.length;
			if (roundingResult.length >= wholeLength) {
				// need to add leading zeroes to fractional part maybe
				// if whole was zero, check if original fractional had leading zeroes
				if (wholeLength === 0) {
					num.fractional = ''.padEnd(num.fractional.length - (+num.fractional).toString().length, '0');
				} else {
					num.fractional = '';
				}
				num.fractional += roundingResult.slice(wholeLength, roundingResult.length);
			} else {
				num.fractional = '';
				num.decimal = '';
				const addZeros = wholeLength - roundingResult.length;
				num.whole = roundingResult;
				for (let i = 0; i < addZeros; i++) {
					num.whole += '0';  	// This adds zeros to whole numbers when rounding in the mantissa. 
					// But should we instead convert to scientific and leave the zeros off?
				}
			}

		} else if (combined.length < options["round-precision"] && options["round-pad"]) {

			for (let i = 0; i < options["round-precision"] - combined.length; i++) {
				num.fractional += '0';  // pad with zeros, it's only going to go in the fractional part
				if (num.decimal === '') num.decimal = '.';
			}

		} else {
			//no rounding needed.
		}

		afterRoundZeroOptions(num, options);
	}
}

function roundUncertainty(num: INumberPiece, options: INumPostOptions): void {
	// only round if uncertainty included
	if (num.uncertainty.length > 0) {
		// just in case convert uncertainty to bracket form... easier to round
		num.uncertainty.forEach(uncertainty => {
			if (uncertainty.type === 'pm') {
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
		});
		// should all uncertainties have same precision? ... no, so round to smallest
		let smallest = 999;
		num.uncertainty.forEach(uncertainty => {
			smallest = Math.min(uncertainty.whole.length, smallest);


			if (uncertainty.whole.length - options["round-precision"] > 0) {
				const firstDrop = +uncertainty.whole.slice(options["round-precision"], options["round-precision"] + 1);
				const toRound = +uncertainty.whole.slice(options["round-precision"] - 1, options["round-precision"]);

				if (shouldRoundUp(toRound, firstDrop, options["round-half"] === 'even')) {
					uncertainty.whole = roundUp(uncertainty.whole, options["round-precision"] - 1);
				} else {
					uncertainty.whole = uncertainty.whole.slice(0, options["round-precision"]);
				}
			}
		});

		const mainRemove = smallest - options["round-precision"];

		if (mainRemove > 0) {
			const combined = num.whole + num.fractional;
			const precision = combined.length - mainRemove;
			const firstDrop = +combined.slice(precision, precision + 1);
			const toRound = +combined.slice(precision - 1, precision);

			let roundingResult;
			// round up or down
			if (shouldRoundUp(toRound, firstDrop, options["round-half"] === 'even')) {
				roundingResult = roundUp(combined, precision - 1);
			} else {
				roundingResult = combined.slice(0, precision);
			}
			// split the result back into whole and fractional parts
			if (roundingResult.length >= num.whole.length) {
				num.fractional = roundingResult.slice(num.whole.length, roundingResult.length);
			} else {
				num.fractional = '';
				num.decimal = '';
				const addZeros = num.whole.length - roundingResult.length;
				num.whole = roundingResult;
				for (let i = 0; i < addZeros; i++) {
					num.whole += '0';  	// This adds zeros to whole numbers when rounding in the mantissa. 
					// But should we instead convert to scientific and leave the zeros off?
				}
			}
		}

		// padding doesn't make sense with uncertainties, skip it.

	}
}

function afterRoundZeroOptions(num: INumberPiece, options: INumPostOptions) {
	// check if zero, then do stuff
	const current = Math.abs(+(num.whole + num.decimal + num.fractional + (num.exponentMarker !== '' ? 'e' : '') + num.exponentSign + num.exponent));
	if (current === 0) {
		if (options["round-minimum"] !== '0') {
			num.prefix = '\\lt';
			const minimumNum = parseNumber(GlobalParser, options["round-minimum"], <INumOptions>options);
			num.sign = minimumNum.sign;
			num.whole = minimumNum.whole;
			num.decimal = minimumNum.decimal;
			num.fractional = minimumNum.fractional;
			num.exponentMarker = minimumNum.exponentMarker;
			num.exponentSign = minimumNum.exponentSign;
			num.exponent = minimumNum.exponent;

		} else if (options["round-zero-positive"]) {
			num.sign = '';
		}
	}
}

const roundModeMap = new Map<string, (num: INumberPiece, options: INumPostOptions) => void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['none', (): void => { }],
	['places', roundPlaces],
	['figures', roundFigures],
	['uncertainty', roundUncertainty]
]);

export function postProcessNumber(num: INumberPiece, options: INumPostOptions) {

	// Post-process special case for uncertainty: 123 +- 4.5
	// This number is actually 123.0 +- 4.5 or 123.0(4.5) or 123.0(45)
	// Even if uncertainty is dropped, the original value had a significant zero in the tenths place.
	// Check fraction length of uncertainty[0] and compare to value fraction length.
	// Could theoretically check for equal uncertainty precision in the case of two uncertainties...
	if (num.uncertainty && num.uncertainty.length > 0 && num.uncertainty[0].fractional.length > num.fractional.length) {
		if (num.decimal === '') {
			num.decimal = '.';
		}
		num.fractional = num.fractional.padEnd(num.uncertainty[0].fractional.length, '0');
	}

	if (options["drop-uncertainty"]) {
		num.uncertainty.splice(0, num.uncertainty.length);
	}
	if (options["drop-exponent"]) {
		num.exponentMarker = '';
		num.exponentSign = '';
		num.exponent = '';
	}

	roundModeMap.get(options["round-mode"])(num, options);

	if (options["drop-zero-decimal"] && +(num.fractional) === 0) {
		num.fractional = '';
		num.decimal = '';
	}

	if (options["minimum-integer-digits"] > 0) {
		const pad = options["minimum-integer-digits"] - num.whole.length;
		if (pad > 0) {
			for (let i = 0; i < pad; i++) {
				num.whole = '0' + num.whole;
			}
		}
	}

	if (options["minimum-decimal-digits"] > 0) {
		const pad = options["minimum-decimal-digits"] - num.fractional.length;
		if (pad > 0) {
			for (let i = 0; i < pad; i++) {
				num.fractional += '0';
			}
		}
	}

	exponentModeMap.get(options["exponent-mode"])(num, options);

	// remove any explicit plus in exponent
	if (num.exponentSign === '+')
		num.exponentSign = '';
}
