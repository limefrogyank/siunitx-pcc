import { INumberPiece, parseNumber } from "./numMethods";
import { INumOptions, INumPostOptions, IOptions } from "./options";
import { GlobalParser } from "./siunitx";

function convertToScientific(num:INumberPiece, options: INumPostOptions) : void {
	//convert to actual number and use formating to print scientific
	const val = (+(num.sign + num.whole + num.decimal + num.fractional + (num.exponent != '' ? ('e' + num.exponentSign + num.exponent): '' ))).toExponential();
	// parse that back in
	const newNum = parseNumber(GlobalParser, val, options as IOptions);

	//don't forget to check for trailing zeros and put them back
	let trailingZeros = 0;
	// count trailing zeros in original fractional part
	if (num.fractional != ''){
		for (let i=num.fractional.length-1; i>=0; i--){
			if (num.fractional[i] == '0'){
				trailingZeros++;
			} else{
				break;
			}
		}
	}
	// count trailing zeros in original whole part (if all of fractional part was zeros)
	if (num.whole != '' && num.fractional.length == trailingZeros){
		for (let i=num.whole.length-1; i>=0; i--){
			if (num.whole[i] == '0'){
				trailingZeros++;
			} else{
				break;
			}
		}
	}
	// add the appropriate number of trailing zeros.
	for(let i=0; i<trailingZeros; i++){
		newNum.fractional += '0';
	}
	// add a decimal if the original didn't have one, but we need it.
	if (newNum.decimal == '' && trailingZeros > 0){
		newNum.decimal = '.';
	}
	// copy the new values to the original reference
	for (const prop in num){
		num[prop] = newNum[prop];
	}
}

function convertToXExponent(num:INumberPiece, targetExponent: number){
	if (num == null) return;
	// count difference between target exponent and current one.
	const diff = targetExponent - +(num.exponentSign + num.exponent);
	const dir = Math.sign(diff);  // -: move numbers from frac to whole, +: move the other way
	for (let i=0; i< Math.abs(diff); i++){
		if (dir < 0){
			if (num.fractional.length > 0){
				num.whole = num.whole + num.fractional.slice(0,1);
				num.fractional = num.fractional.slice(1, num.fractional.length);
			} else {
				num.whole = num.whole + '0';
			}
		} else {
			if (num.whole.length > 0){
				num.fractional = num.whole.slice(num.whole.length-1, num.whole.length) + num.fractional;
				num.whole = num.whole.slice(0, num.whole.length - 1);
			} else {
				num.fractional = '0' + num.fractional;
			}
		}
	}
	if (num.fractional != '' && num.decimal == ''){
		num.decimal = '.';
	}
	num.exponent = Math.abs(targetExponent).toString();
	num.exponentSign = Math.sign(targetExponent) < 0 ? '-' : '';
}

function convertToEngineering(num:INumberPiece, options: INumPostOptions):void {
	// similar to convertToFixed except we calculate the exponent to be a power of three that keeps the whole number part non-zero.
		
	// convert to scientific, then move decimal...
	convertToScientific(num, options);
	let targetExponent = +(num.exponentSign + num.exponent);
	while (targetExponent % 3 != 0) {
		targetExponent--;
	}
		
	convertToXExponent(num, targetExponent);
	
}

export function convertToFixed(num:INumberPiece, options: INumPostOptions):void {
	// convert to scientific, then move decimal...
	convertToScientific(num, options);
	
	convertToXExponent(num, options.fixedExponent);
}

const exponentModeMap = new Map<string, (num:INumberPiece, options: INumPostOptions)=>void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['input', ():void => { }],  // leave number as-is
	['fixed', convertToFixed],
	['engineering', convertToEngineering],
	['scientific', convertToScientific]
]);

function shouldRoundUp(toRound:number, firstDrop:number, roundEven:boolean):boolean{
	let result = false;
	if (firstDrop > 5){
		result = true;	
	} else if (firstDrop == 5) {
		if (roundEven){
			if (toRound % 2 == 0){
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

function roundUp(fullNumber:string, position:number):string{
	let result = '';
	const reverseNumArr = new Array<number>();
	let digit = +fullNumber[position] + 1;
	let roundedNine = digit == 0 ? true : false;
	reverseNumArr.push(digit); 
	for (let i=position-1; i >= 0; i--) {
		if (roundedNine){
			digit = +fullNumber[i] + 1;
			roundedNine = digit == 0 ? true : false;
			reverseNumArr.push(digit);
		} else {
			digit = +fullNumber[i];
			reverseNumArr.push(digit);
		}
	}
	reverseNumArr.reverse();
	reverseNumArr.forEach(v=> result+=v);
	return result;
}

function roundPlaces(num:INumberPiece, options: INumPostOptions):void{
	// if uncertainty exists, no rounding at all!
	if (num.uncertainty.length == 0) {
		if (num.fractional.length > options.roundPrecision ) {			
			//console.log(num.whole + num.decimal + num.fractional);
			const firstDrop = +num.fractional.slice(options.roundPrecision, options.roundPrecision+1);
			const toRound = +num.fractional.slice(options.roundPrecision - 1, options.roundPrecision);
			
			if (shouldRoundUp(toRound, firstDrop, options.roundHalf == 'even')){
				const result = roundUp(num.whole + num.fractional, num.whole.length + options.roundPrecision - 1);
				const wholeLength = num.whole.length;
				num.whole = result.slice(0,wholeLength);
				num.fractional = result.slice(wholeLength, result.length);
			} else {
				num.fractional = num.fractional.slice(0, options.roundPrecision);
			}		

		} else if (num.fractional.length < options.roundPrecision && options.roundPad) {
			for (let i = 0; i < options.roundPrecision-num.fractional.length; i++){
				num.fractional += '0';  // pad with zeros
			}
		} else {
			//no rounding needed.
		}

		afterRoundZeroOptions(num, options);

	}
}

function roundFigures(num:INumberPiece, options: INumPostOptions):void{
	// if uncertainty exists, no rounding at all!
	if (num.uncertainty.length == 0) {
		const combined = num.whole + num.fractional;
		if (combined.length > options.roundPrecision ) {			
			//console.log(num.whole + num.decimal + num.fractional);
			const firstDrop = +combined.slice(options.roundPrecision, options.roundPrecision+1);
			const toRound = +combined.slice(options.roundPrecision - 1, options.roundPrecision);
			
			let roundingResult;
			// round up or down
			if (shouldRoundUp(toRound, firstDrop, options.roundHalf == 'even')){
				roundingResult = roundUp(combined, options.roundPrecision - 1);
			} else {
				roundingResult = combined.slice(0, options.roundPrecision);
			}
			// split the result back into whole and fractional parts
			if (roundingResult.length >= num.whole.length){
				num.fractional = roundingResult.slice(num.whole.length, roundingResult.length);
			} else {
				num.fractional = '';
				num.decimal = '';
				const addZeros = num.whole.length - roundingResult.length;
				num.whole = roundingResult;
				for (let i = 0; i<addZeros;i++){  
					num.whole += '0';  	// This adds zeros to whole numbers when rounding in the mantissa. 
										// But should we instead convert to scientific and leave the zeros off?
				}
			}	

		} else if (combined.length < options.roundPrecision && options.roundPad) {
			
			for (let i = 0; i < options.roundPrecision-combined.length; i++){
				num.fractional += '0';  // pad with zeros, it's only going to go in the fractional part
				if (num.decimal == '') num.decimal = '.';
			}

		} else {
			//no rounding needed.
		}

		afterRoundZeroOptions(num, options);
	}	
}

function roundUncertainty(num:INumberPiece, options: INumPostOptions):void{
	// only round if uncertainty included
	if (num.uncertainty.length > 0){
		// just in case convert uncertainty to bracket form... easier to round
		num.uncertainty.forEach(uncertainty=>{
			if (uncertainty.type == 'pm') {
				//easiest way is to convert to a number and check if less than zero
				const strNum = uncertainty.whole + uncertainty.decimal + uncertainty.fractional;
				const num = +(strNum);
				// if less than 1 (just a fraction), then remove leading zeros.  Else leave it as is.
				if (num < 1) {
					let position=0;
					for (let i=0; i<uncertainty.fractional.length;i++){
						if (uncertainty.fractional[i] != '0'){
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
		num.uncertainty.forEach(uncertainty =>{
			smallest = Math.min(uncertainty.whole.length, smallest);

			
			if (uncertainty.whole.length - options.roundPrecision > 0){
				const firstDrop = +uncertainty.whole.slice(options.roundPrecision, options.roundPrecision+1);
				const toRound = +uncertainty.whole.slice(options.roundPrecision - 1, options.roundPrecision);
				
				if (shouldRoundUp(toRound, firstDrop, options.roundHalf == 'even')){
					uncertainty.whole = roundUp(uncertainty.whole, options.roundPrecision - 1);
				} else {
					uncertainty.whole = uncertainty.whole.slice(0, options.roundPrecision);
				}		
			}
		});
		
		const mainRemove = smallest - options.roundPrecision;

		if (mainRemove > 0){
			const combined = num.whole + num.fractional;
			const precision = combined.length - mainRemove;
			const firstDrop = +combined.slice(precision, precision+1);
			const toRound = +combined.slice(precision - 1, precision);
			
			let roundingResult;
			// round up or down
			if (shouldRoundUp(toRound, firstDrop, options.roundHalf == 'even')){
				roundingResult = roundUp(combined, precision - 1);
			} else {
				roundingResult = combined.slice(0, precision);
			}
			// split the result back into whole and fractional parts
			if (roundingResult.length >= num.whole.length){
				num.fractional = roundingResult.slice(num.whole.length, roundingResult.length);
			} else {
				num.fractional = '';
				num.decimal = '';
				const addZeros = num.whole.length - roundingResult.length;
				num.whole = roundingResult;
				for (let i = 0; i<addZeros;i++){  
					num.whole += '0';  	// This adds zeros to whole numbers when rounding in the mantissa. 
										// But should we instead convert to scientific and leave the zeros off?
				}
			}	
		} 

		// padding doesn't make sense with uncertainties, skip it.

	}
}

function afterRoundZeroOptions(num:INumberPiece, options: INumPostOptions){
	// check if zero, then do stuff
	const current = Math.abs(+(num.whole + num.decimal + num.fractional + (num.exponentMarker != '' ? 'e' : '') + num.exponentSign + num.exponent));
	if (current == 0) {
		if (options.roundMinimum != '0'){
			num.prefix = '\\lt'; 
			const minimumNum = parseNumber(GlobalParser, options.roundMinimum, <INumOptions>options);
			num.sign = minimumNum.sign;
			num.whole = minimumNum.whole;
			num.decimal = minimumNum.decimal;
			num.fractional = minimumNum.fractional;
			num.exponentMarker = minimumNum.exponentMarker;
			num.exponentSign = minimumNum.exponentSign;
			num.exponent = minimumNum.exponent;
			
		} else if (options.roundZeroPositive){
			num.sign = '';
		}
	}
}

const roundModeMap = new Map<string, (num:INumberPiece, options: INumPostOptions)=>void>([
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['none', ():void =>{ }],
	['places', roundPlaces],
	['figures', roundFigures],
	['uncertainty', roundUncertainty]
]);

export function postProcessNumber(num:INumberPiece, options: INumPostOptions){
	
	if (options.dropUncertainty){
		num.uncertainty.splice(0, num.uncertainty.length);
	}
	if (options.dropExponent){
		num.exponentMarker = '';
		num.exponentSign = '';
		num.exponent = '';
	}

	roundModeMap.get(options.roundMode)(num, options);
	
	

	if (options.dropZeroDecimal && +(num.fractional) == 0){
		num.fractional = '';
		num.decimal = '';
	}

	if (options.minimumIntegerDigits > 0){
		const pad = options.minimumIntegerDigits - num.whole.length;
		if (pad > 0){
			for (let i=0; i<pad; i++){
				num.whole = '0' + num.whole;
			}
		}
	}

	if (options.minimumDecimalDigits > 0){
		const pad = options.minimumDecimalDigits - num.fractional.length;
		if (pad > 0){
			for (let i=0; i<pad; i++){
				num.fractional += '0';
			}
		}
	}
	
	exponentModeMap.get(options.exponentMode)(num, options);


	// remove any explicit plus in exponent
	if (num.exponentSign == '+') num.exponentSign = '';
}
