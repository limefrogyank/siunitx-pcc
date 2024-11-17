type ExponentMode = 'input' | 'fixed' | 'engineering' | 'scientific' | 'threshold';
type RoundMode = 'none' | 'figures' | 'places' | 'uncertainty';
type GroupDigits = 'all' | 'none' | 'decimal' | 'integer';
type UncertaintyMode = 'separate' | 'compact' | 'full' | 'compact-marker';
type UncertaintyDescriptorMode = 'bracket' | 'bracket-separator' | 'separator' | 'subscript';

export interface INumParseOptions {
	"evaluate-expression": boolean;			// not implemented, requires library math parser
	expression: string;						// not implemented, requires library math parser
	"input-close-uncertainty": string;
	"input-comparators": string;
	"input-decimal-markers": string;
	"input-digits": string;
	"input-exponent-markers": string;
	"input-ignore": string;
	"input-open-uncertainty": string;
	"input-signs": string;
	"input-uncertainty-signs": string;
	"parse-numbers": boolean;
	"retain-explicit-decimal-marker": boolean;
	"retain-explicit-plus": boolean;
	"retain-negative-zero": boolean;
	"retain-zero-uncertainty": boolean;
}

export interface INumPostOptions {
	"drop-exponent": boolean;
	"drop-uncertainty": boolean;
	"drop-zero-decimal": boolean;
	"exponent-mode": ExponentMode;
	"exponent-thresholds": string;
	"fixed-exponent": number;
	"minimum-integer-digits": number;
	"minimum-decimal-digits": number;
	"round-half": 'up' | 'even';
	"round-minimum": string;
	"round-mode": RoundMode;
	"round-pad": boolean;
	"round-precision": number;
	"round-zero-positive": boolean;
}

export interface INumOutputOptions {
	"bracket-ambiguous-numbers": boolean; // TODO: (bracketAmbiguousNumbers) not implemented yet
	"bracket-negative-numbers": boolean;
	"digit-group-size": number;
	"digit-group-first-size": number;
	"digit-group-other-size": number;
	"exponent-base": string;
	"exponent-product": string;
	"group-digits": GroupDigits;
	"group-minimum-digits": number;
	"group-separator": string; // can be LaTeX spacers, but Unicode is better!
	"negative-color": string;
	"output-close-uncertainty": string;
	"output-decimal-marker": string;
	"output-exponent-marker": string;
	"output-open-uncertainty": string;
	"print-implicit-plus": boolean;
	"print-unity-mantissa": boolean;
	"print-zero-exponent": boolean;
	"print-zero-integer": boolean;
	"tight-spacing": boolean;									// TODO: not implemented
	"uncertainty-descriptor-mode": UncertaintyDescriptorMode; 	// TODO: not implemented
	"uncertainty-descriptor-separator": string;					// TODO: not implemented
	"uncertainty-descriptors": string;							// TODO: not implemented
	"uncertainty-mode": UncertaintyMode;
	"uncertainty-separator": string;
	"zero-decimal-as-symbol": boolean;
	"zero-symbol": string;
}

export interface INumOptions extends INumParseOptions, INumPostOptions, INumOutputOptions { }

export const NumParseOptionDefaults: INumParseOptions = {
	"evaluate-expression": false,
	expression: '#1',
	"input-close-uncertainty": ')',
	"input-comparators": '<=>\\approx\\ge\\geq\\gg\\le\\leq\\ll\\sim',
	"input-decimal-markers": '.,',
	"input-digits": '0123456789',
	"input-exponent-markers": 'dDeE',
	"input-ignore": '',
	"input-open-uncertainty": '(',
	"input-signs": '+-\\pm\\mp',  // currently using a hack to differentiate between \\pm sign vs uncertaintysign
	"input-uncertainty-signs": '\\pm\\mp',
	"parse-numbers": true,
	"retain-explicit-decimal-marker": false,
	"retain-explicit-plus": false,
	"retain-negative-zero": false,
	"retain-zero-uncertainty": false
};


export const NumPostOptionDefaults: INumPostOptions = {
	"drop-exponent": false,
	"drop-uncertainty": false,
	"drop-zero-decimal": false,
	"exponent-mode": 'input',
	"exponent-thresholds": '-3:3',
	"fixed-exponent": 0,
	"minimum-integer-digits": 0,
	"minimum-decimal-digits": 0,
	"round-half": 'up',
	"round-minimum": '0',
	"round-mode": 'none',
	"round-pad": true,
	"round-precision": 2,
	"round-zero-positive": true
};

export const NumOutputOptionDefaults: INumOutputOptions = {
	"bracket-ambiguous-numbers": true,
	"bracket-negative-numbers": false,
	"digit-group-size": 3,
	"digit-group-first-size": -1,  	// These should be -1 so we can detect when they've been explicitly set.
	"digit-group-other-size": -1,		// Otherwise, digitGroupSize will override them.
	"exponent-base": '10',
	"exponent-product": '\\times',
	"group-digits": 'all',
	"group-minimum-digits": 5,
	"group-separator": '\\,',
	"negative-color": '',
	"output-close-uncertainty": ')',
	"output-decimal-marker": '.',
	"output-exponent-marker": '',
	"output-open-uncertainty": '(',
	"print-implicit-plus": false,
	"print-unity-mantissa": true,
	"print-zero-exponent": false,
	"print-zero-integer": true,
	"tight-spacing": false,
	"uncertainty-descriptor-mode": 'bracket-separator',
	"uncertainty-descriptor-separator": '\\',
	"uncertainty-descriptors": '',
	"uncertainty-mode": 'compact',
	"uncertainty-separator": '',
	"zero-decimal-as-symbol": false,
	"zero-symbol": '\\mbox{---}'
}

export const NumOptionDefaults: INumOptions = { ...NumParseOptionDefaults, ...NumPostOptionDefaults, ...NumOutputOptionDefaults };
