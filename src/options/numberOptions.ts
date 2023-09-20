type ExponentMode = 'input' | 'fixed' | 'engineering' | 'scientific' | 'threshold';
type RoundMode = 'none' | 'figures' | 'places' | 'uncertainty';
type GroupDigits = 'all' | 'none' | 'decimal' | 'integer';
type UncertaintyMode = 'separate' | 'compact' | 'full' | 'compact-marker';
type UncertaintyDescriptorMode = 'bracket' | 'bracket-separator' | 'separator' | 'subscript';

export interface INumParseOptions {
	evaluateExpression: boolean;			// not implemented, requires library math parser
	expression: string;						// not implemented, requires library math parser
	inputCloseUncertainty: string;
	inputComparators: string;
	inputDecimalMarkers: string;
	inputDigits: string;
	inputExponentMarkers: string;
	inputIgnore: string;
	inputOpenUncertainty: string;
	inputSigns: string;
	inputUncertaintySigns: string;
	parseNumbers: boolean;
	retainExplicitDecimalMarker: boolean;
	retainExplicitPlus: boolean;
	retainNegativeZero: boolean;
	retainZeroUncertainty: boolean;
}

export interface INumPostOptions {
	dropExponent: boolean;
	dropUncertainty: boolean;
	dropZeroDecimal: boolean;
	exponentMode: ExponentMode;
	exponentThresholds: string;
	fixedExponent: number;
	minimumIntegerDigits: number;
	minimumDecimalDigits: number;
	roundHalf: 'up' | 'even';
	roundMinimum: string;
	roundMode: RoundMode;
	roundPad: boolean;
	roundPrecision: number;
	roundZeroPositive: boolean;
}

export interface INumOutputOptions {
	bracketAmbiguousNumbers: boolean; // TODO: (bracketAmbiguousNumbers) not implemented yet
	bracketNegativeNumbers: boolean;
	digitGroupSize: number;
	digitGroupFirstSize: number;
	digitGroupOtherSize: number;
	exponentBase: string;
	exponentProduct: string;
	groupDigits: GroupDigits;
	groupMinimumDigits: number;
	groupSeparator: string; // can be LaTeX spacers, but Unicode is better!
	negativeColor: string;
	outputCloseUncertainty: string;
	outputDecimalMarker: string;
	outputExponentMarker: string;
	outputOpenUncertainty: string;
	printImplicitPlus: boolean;
	printUnityMantissa: boolean;
	printZeroExponent: boolean;
	printZeroInteger: boolean;
	tightSpacing: boolean;									// TODO: not implemented
	uncertaintyDescriptorMode: UncertaintyDescriptorMode; 	// TODO: not implemented
	uncertaintyDescriptorSeparator: string;					// TODO: not implemented
	uncertaintyDescriptors: string;							// TODO: not implemented
	uncertaintyMode: UncertaintyMode;
	uncertaintySeparator: string;
	zeroDecimalAsSymbol: boolean;
	zeroSymbol: string;
}

export interface INumOptions extends INumParseOptions, INumPostOptions, INumOutputOptions { }

export const NumParseOptionDefaults: INumParseOptions = {
	evaluateExpression: false,
	expression: '#1',
	inputCloseUncertainty: ')',
	inputComparators: '<=>\\approx\\ge\\geq\\gg\\le\\leq\\ll\\sim',
	inputDecimalMarkers: '.,',
	inputDigits: '0123456789',
	inputExponentMarkers: 'dDeE',
	inputIgnore: '',
	inputOpenUncertainty: '(',
	inputSigns: '+-\\pm\\mp',  // currently using a hack to differentiate between \\pm sign vs uncertaintysign
	inputUncertaintySigns: '\\pm\\mp',
	parseNumbers: true,
	retainExplicitDecimalMarker: false,
	retainExplicitPlus: false,
	retainNegativeZero: false,
	retainZeroUncertainty: false
};


export const NumPostOptionDefaults: INumPostOptions = {
	dropExponent: false,
	dropUncertainty: false,
	dropZeroDecimal: false,
	exponentMode: 'input',
	exponentThresholds: '-3:3',
	fixedExponent: 0,
	minimumIntegerDigits: 0,
	minimumDecimalDigits: 0,
	roundHalf: 'up',
	roundMinimum: '0',
	roundMode: 'none',
	roundPad: true,
	roundPrecision: 2,
	roundZeroPositive: true
};

export const NumOutputOptionDefaults: INumOutputOptions = {
	bracketAmbiguousNumbers: true,
	bracketNegativeNumbers: false,
	digitGroupSize: 3,
	digitGroupFirstSize: -1,  	// These should be -1 so we can detect when they've been explicitly set.
	digitGroupOtherSize: -1,		// Otherwise, digitGroupSize will override them.
	exponentBase: '10',
	exponentProduct: '\\times',
	groupDigits: 'all',
	groupMinimumDigits: 5,
	groupSeparator: '\\,',
	negativeColor: '',
	outputCloseUncertainty: ')',
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

export const NumOptionDefaults: INumOptions = { ...NumParseOptionDefaults, ...NumPostOptionDefaults, ...NumOutputOptionDefaults };
