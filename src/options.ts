import TexError from "mathjax-full/js/input/tex/TexError";
import TexParser from "mathjax-full/js/input/tex/TexParser";

type PrintMode = 'match' | 'math' | 'text';
type PerMode = 'power'| 'fraction' | 'symbol' | 'power-positive-first' | 'repeated-symbol' | 'single-symbol' | 'perMode';
export type QualifierMode = 'subscript' | 'bracket' | 'combine' | 'phrase';
type ExponentMode = 'input' | 'fixed' | 'engineering' | 'scientific';
type RoundMode = 'none' | 'figures' | 'places' | 'uncertainty';
type GroupDigits = 'all' | 'none' | 'decimal' | 'integer';
type UncertaintyMode = 'separate'|'compact'|'full'|'compact-marker';
type UncertaintyDescriptorMode = 'bracket'|'bracket-separator'|'separator'|'subscript';
type AngleMode = 'input' | 'arc' | 'decimal';
export type PrefixMode = 'input' | 'combine-exponent' | 'extract-exponent';
export type SeparateUncertaintyUnits = 'bracket' | 'repeat' | 'single'; 

export interface IPrintOptions {
	color: string;						// not implemented
	mode: PrintMode;					// not implemented
	numberColor: string;				// not implemented
	numberMode: PrintMode;				// not implemented
	propagateMathFont: boolean;			// not implemented
	resetMathVersion: boolean; 			// not implemented
	resetTextFamily: boolean; 			// not implemented
	resetTextSeries: boolean; 			// not implemented
	resetTextShape: boolean; 			// not implemented
	textFamilyToMath:boolean;			// not implemented
	textFontCommand:string;				// not implemented
	textSubscriptCommand:string;		// not implemented
	textSuperscriptCommand:string;		// not implemented
	textSeriesToMath:boolean;			// not implemented
	unitColor:string;					// not implemented
	unitMode:PrintMode;					// not implemented
}

export interface IUnitOptions {
	interUnitProduct: string;
	perMode: PerMode;
	displayPerMode: PerMode;	// not implemented, global setting
	inlinePerMode: PerMode;		// not implemented, global setting
	perSymbol: string; 
	fractionCommand: string;
	bracketUnitDenominator: boolean;
	perSymbolScriptCorrection: string;
	stickyPer: boolean;
	qualifierMode: QualifierMode;
	qualifierPhrase: string;
	powerHalfAsSqrt: boolean;
	parseUnits: boolean;
	forbidLiteralUnits: boolean;
	unitFontCommand: string;
}

export interface INumParseOptions{
	evaluateExpression: boolean;			// not implemented, requires library math parser
	expression: string;						// not implemented, requires library math parser
	inputCloseUncertainty: string;
	inputComparators: string;
	inputDecimalMarkers: string;
	inputDigits:string;
	inputExponentMarkers:string;
	inputIgnore:string;
	inputOpenUncertainty: string;
	inputSigns:string;
	inputUncertaintySigns:string;
	parseNumbers:boolean;
	retainExplicitDecimalMarker:boolean;
	retainExplicitPlus:boolean;
	retainNegativeZero:boolean;
	retainZeroUncertainty:boolean;
} 

export interface INumPostOptions{
	dropExponent:boolean;
	dropUncertainty:boolean;
	dropZeroDecimal:boolean;
	exponentMode:ExponentMode;
	fixedExponent:number;
	minimumIntegerDigits:number;
	minimumDecimalDigits:number;
	roundHalf: 'up' | 'even';
	roundMinimum: string;
	roundMode: RoundMode;
	roundPad: boolean;
	roundPrecision: number;
	roundZeroPositive: boolean;
} 

export interface INumOutputOptions {
	bracketNegativeNumbers: boolean;
	digitGroupSize: number;
	digitGroupFirstSize: number;
	digitGroupOtherSize: number;
	exponentBase: string;
	exponentProduct: string;
	groupDigits: GroupDigits;
	groupMinimumDigits: number;
	groupSeparator: string;
	negativeColor: string;
	outputCloseUncertainty: string;
	outputDecimalMarker: string;
	outputExponentMarker: string;
	outputOpenUncertainty: string;
	printImplicitPlus: boolean;
	printUnityMantissa:boolean;
	printZeroExponent:boolean;
	printZeroInteger:boolean;
	tightSpacing:boolean;									// not implemented
	uncertaintyDescriptorMode:UncertaintyDescriptorMode; 	// not implemented
	uncertaintyDescriptorSeparator:string;					// not implemented
	uncertaintyDescriptors:string;							// not implemented
	uncertaintyMode: UncertaintyMode;
	uncertaintySeparator: string;
	zeroDecimalAsSymbol: boolean;
	zeroSymbol:string;
}

export interface INumOptions extends INumParseOptions, INumPostOptions, INumOutputOptions { }

export interface IQuantityOptions extends INumOptions, IUnitOptions{
	allowQuantityBreaks: boolean;
	extractMassInKilograms: boolean;
	prefixMode: PrefixMode;
	quantityProduct: '\\,';
	separateUncertaintyUnits: SeparateUncertaintyUnits;
}

// since angles use the same system number processing system, it extends the INumOptions
export interface IAngleOptions extends INumOptions {
	angleMode: AngleMode;
	angleSymbolDegree: string;
	angleSymbolMinute: string;
	angleSymbolOverDecimal: boolean;
	angleSymbolSecond: string;
	angleSeparator: string,
	fillAngleDegrees: boolean,
	fillAngleMinutes: boolean,
	fillAngleSeconds: boolean,
	numberAngleProduct: string
}

export interface IOptions extends IUnitOptions, INumOptions, IAngleOptions, IQuantityOptions { }

export const PrintOptionsDefault : IPrintOptions = {
	color: '',
	mode: 'math',
	numberColor: '',
	numberMode: 'math',
	propagateMathFont: false,
	resetMathVersion: true,
	resetTextFamily: true,
	resetTextSeries: true,
	resetTextShape: true,
	textFamilyToMath: false,
	textFontCommand: '',
	textSubscriptCommand: '\\textsubscript',
	textSuperscriptCommand: '\\textsuperscript',
	textSeriesToMath: false,
	unitColor: '',
	unitMode: 'math'
}

export const UnitOptionDefaults: IUnitOptions = {
    bracketUnitDenominator: true,
    forbidLiteralUnits: false,
    fractionCommand: '\\frac',
	interUnitProduct: '\\,',
	parseUnits: true,
	perMode: 'power',
	displayPerMode: 'perMode',
	inlinePerMode: 'perMode',
	perSymbolScriptCorrection: '\\!',
	perSymbol: '/',
	powerHalfAsSqrt: false,
	qualifierMode: 'subscript',
	qualifierPhrase: '',
	stickyPer: false,
	unitFontCommand: '\\mathrm'
}

export const NumParseOptionDefaults: INumParseOptions = {
    evaluateExpression: false,
	expression: '#1',
	inputCloseUncertainty: ')',
	inputComparators: '<=>\\approx\\ge\\geq\\gg\\le\\leq\\ll\\sim',
	inputDecimalMarkers: '.,',
	inputDigits: '0123456789',
	inputExponentMarkers: 'dDeE',
	inputIgnore:'',
	inputOpenUncertainty:'(',
	inputSigns:'+-\\pm\\mp',  // currently using a hack to differentiate between \\pm sign vs uncertaintysign
	inputUncertaintySigns: '\\pm\\mp',
	parseNumbers: true,
	retainExplicitDecimalMarker: false,
	retainExplicitPlus: false,
	retainNegativeZero: false,
	retainZeroUncertainty: false
};

export const NumPostOptionDefaults: INumPostOptions = {
	dropExponent: false,
	dropUncertainty:false,
	dropZeroDecimal:false,
	exponentMode: 'input',
	fixedExponent: 0,
	minimumIntegerDigits: 0,
	minimumDecimalDigits: 0,
	roundHalf: 'up',
	roundMinimum: '0',
	roundMode:'none',
	roundPad: true,
	roundPrecision: 2,
	roundZeroPositive: true
};

export const NumOutputOptionDefaults: INumOutputOptions = {
	bracketNegativeNumbers: false,
	digitGroupSize: 3,
	digitGroupFirstSize:-1,  	// These should be -1 so we can detect when they've been explicitly set.
	digitGroupOtherSize:-1,		// Otherwise, digitGroupSize will override them.
	exponentBase: '10',
	exponentProduct: '\\times',
	groupDigits: 'all',
	groupMinimumDigits: 5,
	groupSeparator: '\\,',
	negativeColor: '',
	outputCloseUncertainty:')',
	outputDecimalMarker: '.',
	outputExponentMarker: '',
	outputOpenUncertainty: '(',
	printImplicitPlus: false,
	printUnityMantissa: true,
	printZeroExponent: false,
	printZeroInteger: true,
	tightSpacing: false,
	uncertaintyDescriptorMode: 'bracket-separator',
	uncertaintyDescriptorSeparator: '\\',
	uncertaintyDescriptors: '',
	uncertaintyMode: 'compact',
	uncertaintySeparator: '',
	zeroDecimalAsSymbol: false,
	zeroSymbol: '\\mbox{---}'
}

export const NumOptionDefaults: INumOptions = {...NumParseOptionDefaults, ...NumPostOptionDefaults, ...NumOutputOptionDefaults};

export const QuantityOptionDefaults: IQuantityOptions = {
	...NumOptionDefaults,
	...UnitOptionDefaults,
	allowQuantityBreaks: false,
	extractMassInKilograms: true,
	prefixMode: 'input',
	quantityProduct: '\\,',
	separateUncertaintyUnits: 'bracket'
}

export const AngleOptionDefaults: IAngleOptions = {
	...NumOptionDefaults,
	angleMode: 'input',
	angleSymbolDegree: '\\degree',
	angleSymbolMinute: "'", //'\\arcminute',
	angleSymbolOverDecimal: false,
	angleSymbolSecond: "''",//'\\arcsecond',
	angleSeparator: '',
	fillAngleDegrees: false,
	fillAngleMinutes: false,
	fillAngleSeconds: false,
	numberAngleProduct: ''
}

// Needed a new version of TexParser.GetBrackets because it wanted to parse the internal macros automatically.  
// This method just gets the bracketed option string only.
export function findOptions(parser:TexParser): string {
	if (parser.GetNext() !== '['){
		return '';
	}
	const j = ++parser.i;
	let depth=0;
	while (parser.i < parser.string.length){
		if (parser.string.charAt(parser.i) == '{') depth++; 
		else if (parser.string.charAt(parser.i) == '}') depth--;
		else if (parser.string.charAt(parser.i) == ']' && depth == 0){
			const result = parser.string.slice(j, parser.i);
			parser.i++;
			return result;
		}
		parser.i++;
	}
	throw new TexError('MissingCloseBracket',
	'Could not find closing \']\' for argument to %1', parser.currentCS);
}

// from https://stackoverflow.com/a/10425344/1938624
function camelCase(input: string) { 
    return input.toLowerCase().replace(/-(.)/g, (match, group) => {
        return group.toUpperCase();
    });
}

export function processOptions(globalOptions: IOptions, optionString: string) : void {
	//const options : IOptions = {...defaultOptions};

	if (optionString != null){
		// check if wrapped in curly braces and remove them
		while (optionString.startsWith('{') && optionString.endsWith('}')){
			optionString = optionString.slice(1, optionString.length-1);
		}
		let prop = '';
		let onValue=false;
		let depth = 0;
		let escaped = false;
		let value = '';
		for (const c of optionString) {
			if (c == '{'){
				if (onValue){
					value += c;
				} else {
					prop += c;
				}
				depth++;
			} 
			else if (c == '}') {
				depth--;
				if (onValue){
					value += c;
				} else {
					prop += c;
				}
			}
			else if (c == '\\'){
				escaped = true;
				if (onValue){
					value += c;
				} else {
					prop += c;
				}
			}
			else if (c == ',' && depth == 0 && !escaped){
				prop = camelCase(prop.trim());
				//console.log(prop + ': ' + value);
				if (value == ''){
					globalOptions[prop] = true;
				}
				else if ( typeof globalOptions[prop] === 'number' ){
					globalOptions[prop] = +(value.trim());
				} else if (typeof globalOptions[prop] === 'boolean') {
					globalOptions[prop] = (value.trim() === 'true');
				} else {
					if (value.indexOf('\\') == -1){
						value = value.trim();
					}
					globalOptions[prop] = value;
				}
				prop = '';
				value = '';
				onValue = false;
			}
			else if (c == '=' && depth == 0){
				onValue = true;
			}
			else {
				if (onValue){
					value += c;
				} else {
					prop += c;
				}
			}


		}

		prop = camelCase(prop.trim());
		//console.log(prop + ': ' + value);
		if (value == ''){
			globalOptions[prop] = true;
		}
		else if ( typeof globalOptions[prop] === 'number' ){
			globalOptions[prop] = +(value.trim());
		} else if (typeof globalOptions[prop] === 'boolean') {
			globalOptions[prop] = (value.trim() === 'true');
		} else {
			if (value.indexOf('\\') == -1){
				value = value.trim();
			}
			globalOptions[prop] = value;
		}
	}

	
}