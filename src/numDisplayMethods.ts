import { INumberPiece, IUncertainty } from "./numMethods";
import { INumOutputOptions } from "./options";

function addSpacing(text:string, digitGroupSize:number, minimum: number, spacer:string, reverse: boolean, digitGroupFirstSize?: number, digitGroupOtherSize?: number ){
	if (text.length >= minimum){
		const arr = text.split('');
		let adjusted = 0;
		const firstCount = (digitGroupFirstSize != -1 && digitGroupFirstSize != undefined) ? digitGroupFirstSize : digitGroupSize;
		let fluidCount = firstCount;
		if (reverse){
			for (let i=firstCount; i < arr.length; i+=fluidCount){
				text = text.slice(0,i + adjusted) + spacer + text.slice(i + adjusted, text.length + adjusted);
				adjusted += spacer.length;
				fluidCount = (digitGroupOtherSize!= -1 && digitGroupOtherSize != undefined) ? digitGroupOtherSize : digitGroupSize;
			}
		} else {
			for (let i=arr.length - firstCount; i >= 0; i-=fluidCount){
				text = text.slice(0,i) + spacer + text.slice(i, text.length + adjusted);
				adjusted += spacer.length;
				fluidCount = (digitGroupOtherSize!= -1 && digitGroupOtherSize != undefined) ? digitGroupOtherSize : digitGroupSize;
			}
		}
	}
	return text;
}


const groupNumbersMap = new Map<string,(num:INumberPiece, options:INumOutputOptions)=>void>([
	['all', (num:INumberPiece, options:INumOutputOptions):void => {
		num.whole = addSpacing(num.whole, options.digitGroupSize, options.groupMinimumDigits, options.groupSeparator, false, options.digitGroupFirstSize, options.digitGroupOtherSize);
		num.fractional = addSpacing(num.fractional, options.digitGroupSize, options.groupMinimumDigits, options.groupSeparator, true, options.digitGroupFirstSize, options.digitGroupOtherSize);

	}],
	['decimal', (num:INumberPiece, options:INumOutputOptions):void => {
		num.fractional = addSpacing(num.fractional, options.digitGroupSize, options.groupMinimumDigits, options.groupSeparator, true, options.digitGroupFirstSize, options.digitGroupOtherSize);

	}],
	['integer', (num:INumberPiece, options:INumOutputOptions):void => {
		num.whole = addSpacing(num.whole, options.digitGroupSize, options.groupMinimumDigits, options.groupSeparator, false, options.digitGroupFirstSize, options.digitGroupOtherSize);
	}],
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	['none', ():void => { }]
]);


function convertUncertaintyToPlusMinus(uncertainty: IUncertainty, piece:INumberPiece, options: INumOutputOptions) : void {
	if (uncertainty.type != 'pm') {
		// if there's a decimal in the uncertainty, then it's ok to display as-is
		if (uncertainty.decimal == ''){
			// add zeros, move whole to fraction part, and potentially add decimal and whole
			const diff = piece.fractional.length - uncertainty.whole.length;
			if (diff >= 0 ){
				for (let i=0; i<diff; i++){
					uncertainty.fractional += "0";
				}
				uncertainty.fractional += uncertainty.whole;
				uncertainty.whole = '0';
				uncertainty.decimal = options.outputDecimalMarker; 
			} else {
				// uncertainty is bigger than fraction.  Need to add a decimal!
				// TO DO
			}
			
		}
	}
}

export function convertUncertaintyToBracket(uncertainty: IUncertainty, piece:INumberPiece, options: INumOutputOptions) : void {
	if (uncertainty.type == 'bracket') {
		// check to make sure that uncertainty doesn't need a decimal point via 'compact marker'
		const diff = uncertainty.whole.length - piece.fractional.length;
		if (diff > 0 && options.uncertaintyMode == 'compact-marker'){
			uncertainty.fractional = uncertainty.whole.slice(diff, uncertainty.whole.length);
			uncertainty.whole = uncertainty.whole.slice(0, diff);
			uncertainty.decimal = options.outputDecimalMarker;
		}
		
	} else {
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
}

function displayUncertaintyBracket(uncertainty: IUncertainty, options: INumOutputOptions):string{
	let output = options.uncertaintySeparator;
	output += options.outputOpenUncertainty;
	output += uncertainty.whole;
	output += options.uncertaintyMode == 'compact-marker' && uncertainty.decimal != '' ? options.outputDecimalMarker : '';
	output += uncertainty.fractional; 
	output += options.outputCloseUncertainty;
	return output;
}

function displayUncertaintyPlusMinus(uncertainty: IUncertainty, options: INumOutputOptions):string{
	return '\\pm' + displayNumber(uncertainty, options);
}

const uncertaintyModeMapping = new Map<string, ( uncertainty:IUncertainty, value: INumberPiece, options: INumOutputOptions)=>string>([
	['separate', (uncertainty: IUncertainty, value:INumberPiece, options: INumOutputOptions):string => {
		convertUncertaintyToPlusMinus(uncertainty, value, options);
		return displayUncertaintyPlusMinus(uncertainty, options);
	}],
	['compact', (uncertainty:IUncertainty,value: INumberPiece,  options: INumOutputOptions):string => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracket(uncertainty, options);
	}],
	['full', (uncertainty:IUncertainty,value: INumberPiece, options: INumOutputOptions):string => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracket(uncertainty, options);
	}],
	['compact-marker', (uncertainty:IUncertainty,value: INumberPiece,  options: INumOutputOptions):string => {
		convertUncertaintyToBracket(uncertainty, value, options);
		return displayUncertaintyBracket(uncertainty, options);
	}],
])


export function displayNumber(piece:INumberPiece, options: INumOutputOptions) : string {
	let output = '';
	groupNumbersMap.get(options.groupDigits)?.(piece, options);	

	if (options.negativeColor != '') {
		output += '{\\color{' + options.negativeColor + '}';
	}
	if (options.bracketNegativeNumbers){
		if (piece.sign == '-'){
			output += '(';
		}
	} else {
		if (options.printImplicitPlus && piece.sign == ''){
			output += '+';
		} else {
			output += piece.sign;
		}
	}

	// if unity mantissa AND don't print it, then we don't need the rest of this.
	if (piece.whole == '1' && piece.fractional == '' && !options.printUnityMantissa){
		// don't do anything UNLESS exponent is also zero and printZeroExponent is false
		if (!options.printZeroExponent && (piece.exponent == '' || (piece.exponent == '1' && piece.exponentSign != '-'))){
			output += '1';
		}
	} else {
		if ((piece.whole == '' && piece.fractional) || piece.whole == '0'){
			if (options.printZeroInteger){
				output += '0';
			}	
		} else {
			output += piece.whole;
		}
		output += (piece.decimal != '' ? options.outputDecimalMarker : '');
		if (options.zeroDecimalAsSymbol && +(piece.fractional) == 0){
			output += options.zeroSymbol;
		} else {
			output += piece.fractional;
		}
	}
	// display uncertanties (if not null)
	piece.uncertainty?.forEach(v=>{
		output += uncertaintyModeMapping.get(options.uncertaintyMode)?.(v,piece,options);
	});

	if (options.printZeroExponent && (piece.exponent == '' || (piece.exponent == '0'))){
		if (options.outputExponentMarker != ''){
			output += options.outputExponentMarker;
			output += '0';
		} else {
			output += options.exponentProduct;
			output += options.exponentBase;
			output += '^{0}';
		}
	} else if (piece.exponent != '' && piece.exponent != '0') {
		// if unity mantissa AND don't print it, then can't print exponentMarkers (E) nor exponentProduct (\\times)
		if (piece.whole == '1' && piece.fractional == '' && !options.printUnityMantissa){
			output += options.exponentBase;
			output += '^{' + piece.exponentSign + piece.exponent + '}';
		} else {
			if (piece.exponentMarker != ''){
				if (options.outputExponentMarker != ''){
					output += options.outputExponentMarker;
					output += piece.exponentSign + piece.exponent;
				} else {
					output += (piece.whole != '' || piece.fractional != '') ? options.exponentProduct : '';
					output += options.exponentBase;
					output += '^{' + piece.exponentSign + piece.exponent + '}';
				}
			}
		}
	}

	if (options.bracketNegativeNumbers){
		if (piece.sign == '-'){
			output += ')';
		}
	} 
	if (options.negativeColor != '') {
		output += '}';
	}

	return output;
}

export function displayOutput(num:INumberPiece, options: INumOutputOptions):string{

	let output = '';
	
	// display any prefix symbol such as less than, greater than, etc.
	output += num.prefix;
	
	// display main number
	output += displayNumber(num, options);
	
	return output;
}