type PrintMode = 'match' | 'math' | 'text';

export interface IPrintOptions {
	mode: PrintMode;					// not implemented - MathJax only does math mode, could use \text{} along with textmacros extension?
	numberMode: PrintMode;				// not implemented - see mode
	unitMode: PrintMode;				// not implemented - see mode
	resetTextFamily: boolean; 			// not implemented - see mode
	resetTextSeries: boolean; 			// not implemented - see mode
	resetTextShape: boolean; 			// not implemented - see mode
	
	
	propagateMathFont: boolean;			// not implemented - not sure if this can be done either
	resetMathVersion: boolean; 			// not implemented	
	textFamilyToMath: boolean;			// not implemented
	textFontCommand: string;			// not implemented
	textSubscriptCommand: string;		// not implemented
	textSuperscriptCommand: string;		// not implemented
	textSeriesToMath: boolean;			// not implemented

	// WARNING: using MathJax, \\color{blue} will only color everything past that point until the END of the LINE.   
	color: string;							
	"number-color": string;					
	"unit-color": string;					
}

export const PrintOptionsDefault: IPrintOptions = {
	color: '',
	mode: 'math',
	"number-color": '',
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
	"unit-color": '',
	unitMode: 'math'
}