import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import TexError from "mathjax-full/js/input/tex/TexError";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { siunitxError } from "./errors";
import { findOptions, IOptions, IUnitOptions, processOptions, QualifierMode } from "./options";
import { UserDefinedUnitOptionsKey, UserDefinedUnitsKey } from "./siunitx";
import { prefixSymbol, unitSymbol, unitSymbolsWithShortcuts } from "./units";

export interface IUnitPiece {
	symbol?:string;
	prefix?:string;
	position?: 'numerator' | 'denominator', // used as an override for power.  i.e. can make power negative if denominator.
	power?:number;
	qualifier?:string;
	cancel?: boolean;
	highlight?: string; // color
}


interface IUnitMacroProcessResult {
	type: 'prefix' | 'unit' | 'previous' | 'next';  // either a prefix, unit, or modifier for previous or next unit
	result: IUnitPiece;
	options?: string;
}

const modifierMacros: Array<string> = new Array<string>(
	'square',
	'cubic',
	'squared',
	'cubed',
	'tothe',
	'raiseto',
	'per',
	'of',
	'cancel',
	'highlight'
);

function processUnitMacro(macro:string, parser:TexParser) : IUnitMacroProcessResult {
	macro = macro.substring(1);
	if (modifierMacros.includes(macro)){
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return modifierMacroMap.get(macro)!(macro, parser);
	} 

	if (prefixSymbol.has(macro)) {
		return {type: 'prefix', result: {prefix: prefixSymbol.get(macro)}};
	}

	const userDefinedUnits = parser.configuration.packageData.get(UserDefinedUnitsKey) as Map<string, string>;
	if (userDefinedUnits.has('\\' + macro)){
		const result = userDefinedUnits.get('\\' + macro);
		const userDefinedUnitOptions = parser.configuration.packageData.get(UserDefinedUnitOptionsKey) as Map<string, string>;
		const options = userDefinedUnitOptions.get('\\' + macro);
		return {type: 'unit', result: {symbol: result as string, prefix: ''}, options: options};
	}

	if (unitSymbolsWithShortcuts.has(macro)){
		const result = unitSymbolsWithShortcuts.get(macro);
		return {type: 'unit', result: {symbol: result as string, prefix: ''}};
	}

	throw siunitxError.NoInterpretationForUnitMacro('\\' + macro);
}

const modifierMacroMap = new Map<string, (macro:string, parser:TexParser)=>IUnitMacroProcessResult>([
	['square', ():IUnitMacroProcessResult => {return {type: "next", result: {power: 2}};}], 
	['cubic', ():IUnitMacroProcessResult => {return {type: "next", result: {power: 3}};}],
	['squared', ():IUnitMacroProcessResult => {return {type: "previous", result: {power: 2}};}],
	['cubed', ():IUnitMacroProcessResult => {return {type: "previous", result: {power: 3}};}],
	['tothe', (macro:string, parser:TexParser):IUnitMacroProcessResult => {
		const arg = parser.GetArgument('tothe', true);
		return {type: "previous", result: {power: +arg}};
	}],
	['raiseto', (macro:string, parser:TexParser):IUnitMacroProcessResult => {
		const arg = parser.GetArgument('raiseto');
		return {type: "next", result: {power: +arg}};
	}],
	['per', ():IUnitMacroProcessResult => {return {type: "next", result: {position: 'denominator'}};}],
	['of', (macro:string, parser:TexParser):IUnitMacroProcessResult => {
		const arg = parser.GetArgument('of');
		return {type: "previous", result:{qualifier: arg}};
	}],
	['cancel', ():IUnitMacroProcessResult => {return {type: "next", result:{cancel: true}};}],
	['highlight', (macro:string, parser:TexParser):IUnitMacroProcessResult => {
		const arg = parser.GetArgument('highlight');
		return {type: "next", result:{highlight: arg}};
	}],
]);

const qualiferMethod = new Map<QualifierMode, (qualifer:string, phrase?:string)=>string>([
	['subscript', (qualifer:string):string => {return '_{'+ qualifer + '}';}],
	['bracket', (qualifer:string):string => {return '('+ qualifer + ')';}],
	['combine', (qualifer:string):string => {return qualifer; }],
	['phrase', (qualifer:string, phrase?:string):string => {return phrase + qualifer;}],
]);

function unitLatex(unitPiece: IUnitPiece, options:IUnitOptions, absPower = false) : {latex: string, superscriptPresent:boolean }{
	let unitLatex = '';
	if (unitPiece.cancel){
		unitLatex += '\\cancel{';
	}
	if (unitPiece.highlight){
		unitLatex += '{\\color{' + unitPiece.highlight + '}';
	}
	unitLatex += options.unitFontCommand + '{';
	unitLatex += '\\class{MathML-Unit}{' + unitPiece.prefix + unitPiece.symbol + '}';
	if (unitPiece.qualifier){
		unitLatex += qualiferMethod.get(options.qualifierMode)?.(unitPiece.qualifier, options.qualifierPhrase);
	}
	unitLatex += '}';
	const power = unitPiece.power != null 
		? (absPower 
			? Math.abs(unitPiece.power * (unitPiece.position == 'denominator' ? -1 : 1)) 
			: unitPiece.power * (unitPiece.position == 'denominator' ? -1 : 1)) 
		: (absPower 
			? Math.abs(1 * (unitPiece.position == 'denominator' ? -1 : 1))
			: 1 * (unitPiece.position == 'denominator' ? -1 : 1));
	if (power != null && power != 1 ){
		unitLatex += '^{' + power + '}';
	}
	if (unitPiece.cancel){
		unitLatex += '}';
	}
	if (unitPiece.highlight){
		unitLatex += '}';
	}
	return {latex: unitLatex, superscriptPresent: power != 1 };
}

export function displayUnits(parser:TexParser, unitPieces:Array<IUnitPiece>, options: IOptions) : string {
	//const mainOptions = parser.configuration.packageData.get('siunitx') as IUnitOptions;

	let texString='';
	let perForSingle = false;
	if (unitPieces.length >= 2 && unitPieces.filter((v)=>{
		const power = v.power != null 
		? (v.power * (v.position == 'denominator' ? -1 : 1)) 
		: 1;
		return Math.sign(power) == -1;
	}).length == 1 && options.perMode == 'single-symbol'){
		perForSingle = true;
	}
	if (options.perMode == 'fraction' || options.perMode == 'symbol'|| options.perMode == 'repeated-symbol' || perForSingle){
		let numerator = '';
		let denominator = '';
		let lastNumeratorHadSuperscript=false;
		unitPieces.forEach((v)=>{
			let latexResult;			
			if (v.position == 'denominator' || (v.power != null && v.power < 0)){
				latexResult = unitLatex(v, options, options.perMode == 'fraction' || options.perMode == 'symbol' || options.perMode == 'repeated-symbol' || options.perMode == "single-symbol" || perForSingle);  

				if (denominator != ''){
					if (options.perMode == 'repeated-symbol'){
						if (latexResult.superscriptPresent){
							denominator += options.perSymbolScriptCorrection;
						}
						denominator += options.perSymbol;
					} else {
						denominator += options.interUnitProduct;
					}
				}					
				denominator += latexResult.latex;
			} else {
				latexResult = unitLatex(v, options, options.perMode == 'fraction' || options.perMode == 'symbol' || options.perMode == 'repeated-symbol' || options.perMode == "single-symbol" || perForSingle);  
				lastNumeratorHadSuperscript = latexResult.superscriptPresent;
				if (numerator != ''){
					numerator += options.interUnitProduct;
				}	
				numerator += latexResult.latex;
			}
		});

		// if no numerator, use 1... but use nothing if denominator is empty, too
		if (numerator == '' && denominator != ''){
			numerator = '1';
		}
		// if no denominator, then no fraction needed.
		if (denominator != ''){
			if (options.perMode == 'fraction'){
				texString = options.fractionCommand + '{' + numerator + '}{' + denominator + '}';
			}
			else if (options.perMode == 'repeated-symbol' || options.perMode == 'symbol' || perForSingle){
				texString = numerator + (lastNumeratorHadSuperscript ? options.perSymbolScriptCorrection : '') + options.perSymbol + denominator;
			} 
			else {
				console.log("shouldn't be here");
			}
		} else {
			texString = numerator;
		}

	} else {
		if (options.perMode == 'power-positive-first'){
			unitPieces = unitPieces.sort((x,y)=>{
				let a = x.power != null ? x : 1;
				if (x.position == 'denominator'){
					a = -a;
				}
				let b = y.power != null ? y : 1;
				if (y.position == 'denominator'){
					b = -b;
				}
				if (a > b) return 1;
				else if (a < b) return -1;
				else return 0;
			});
		}
		let latex = '';
		let lastHadSuperscript=false;
		unitPieces.forEach((v)=>{
			const latexResult = unitLatex(v, options);  
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			lastHadSuperscript = latexResult.superscriptPresent;
			if (latex != ''){
				latex += options.interUnitProduct;
			}	
			latex += latexResult.latex;
			
		});

		texString = latex;
	}
	return texString;

}

export function parseUnit(parser: TexParser, text:string, globalOptions: IOptions, localOptionString: string) : Array<IUnitPiece> {
	const unitPieces: Array<IUnitPiece> = new Array<IUnitPiece>();
	
	// argument contains either macros or it's just plain text
	if (text.indexOf('\\') != -1){
		const subParser = new TexParser(text, parser.stack.env, parser.configuration)
		subParser.i = 0;
		let nextModifier: IUnitPiece | null = null;
		while (subParser.i < subParser.string.length){
			const macro = subParser.GetArgument('unit');
			const processedMacro = processUnitMacro(macro, subParser);
			// check for user defined options
			if (processedMacro.options !== undefined){
				processOptions(globalOptions, processedMacro.options);
			}
			// apply immediate options here
			processOptions(globalOptions, localOptionString);
			
			switch (processedMacro.type){
				case 'next':
				case 'prefix':
					if (nextModifier != null){
						nextModifier = Object.assign(nextModifier, processedMacro.result);
					} else {
						nextModifier = processedMacro.result;
					}
					break;
				case 'previous':
				{
					if (unitPieces.length == 0){
						throw new TexError("MissingPreviousMacro", "There is no previous macro for %1 to modify.", macro);
					}
					let last = unitPieces[unitPieces.length - 1];
					last = Object.assign(last, processedMacro.result);
					break;
				}
				case 'unit':
				{
					if (nextModifier != null){
						processedMacro.result = Object.assign(processedMacro.result, nextModifier);
						if ((parser.options as IOptions).perMode == 'repeated-symbol'){
							const denom = nextModifier.position == 'denominator';
							nextModifier = null;
							if (denom){
								nextModifier = {position: 'denominator'};
							}
						} else {
							nextModifier = null;
						}
					}
					unitPieces.push(processedMacro.result);
					break;
				}
			}
		}

	} else {
		unitPieces.push(...parsePlainTextUnits(parser, text));
	}
	return unitPieces;
}

export function processUnit(parser: TexParser): MmlNode {
	const globalOptions : IOptions = {...parser.options as IOptions};

	const localOptionString = findOptions(parser);    
	
	//processOptions(globalOptions, localOptionString);

	const text = parser.GetArgument('unit');

	//const mainOptions = parser.configuration.packageData.get('siunitx') as IUnitOptions;
	//let globalOptions: IOptions = {...parser.options as IOptions};
	
	const unitPieces = parseUnit(parser, text, globalOptions, localOptionString);
	

	const texString = displayUnits(parser, unitPieces, globalOptions);
	
	return (new TexParser(texString, parser.stack.env, parser.configuration)).mml();	
}

function joinValues(values: IterableIterator<string>, joinString: string): string { 
	return Array<string>.from(values).filter((e,i,a)=> i===a.indexOf(e)).sort((a,b)=> a.length - b.length).join(joinString); 
}


function processPrefixUnitCombo(text:string, unitPiece:IUnitPiece): void{
	const prefixes = joinValues(prefixSymbol.values(), '|');
	const units = joinValues(unitSymbol.values(), '|');

	const regex = new RegExp('(' + prefixes + ')?(' + units + ')');
	const result = regex.exec(text);

	if (result == null){
		return;
	}

	if (result[1] !== undefined){
		unitPiece.prefix = result[1];
	} else {
		unitPiece.prefix = '';
	}
	unitPiece.symbol = result[2];
}

function parsePlainTextUnits(parser:TexParser, text:string): Array<IUnitPiece> {
	//const mainOptions = parser.configuration.packageData.get('siunitx') as IUnitOptions;
	const unitPieces: Array<IUnitPiece> = new Array<IUnitPiece>();
	const subParser = new TexParser(text, parser.stack.env, parser.configuration);
	subParser.i=0;

	let unitPiece:IUnitPiece = { position: 'numerator'};
	let isDenominator = false;
	let prefixUnit = '';
	while (subParser.i < subParser.string.length){
		switch (subParser.string.charAt(subParser.i)) {
			case '~':
			case '.':
				//process prefix-unit string into unitPiece
				processPrefixUnitCombo(prefixUnit, unitPiece);
				unitPieces.push(unitPiece);
				prefixUnit = ''
				unitPiece = {position: isDenominator ? 'denominator' : 'numerator'};
				break;
			case '/':
				//process prefix-unit string into unitPiece
				processPrefixUnitCombo(prefixUnit, unitPiece);
				unitPieces.push(unitPiece);
				prefixUnit = ''
				isDenominator=true;
				unitPiece = {position: isDenominator ? 'denominator' : 'numerator'};
				break;
			case '^':
			{
				//power
				let next = subParser.string.charAt(++subParser.i);
				let power = '';
				if (next == '{'){
					while ((next = subParser.string.charAt(++subParser.i)) != '}'){
						power += next;
					}
				} else {
					power = next;
				}
				unitPiece.power = +power;
				break;
			}
			case '_':
			{
				//of
				let next = subParser.string.charAt(++subParser.i);
				let qualifier = '';
				if (next == '{'){
					while ((next = subParser.string.charAt(++subParser.i)) != '}'){
						qualifier += next;
					}
				} else {
					qualifier = next;
				}
				unitPiece.qualifier = qualifier;
				break;
			}
			default:
				//add char to prefix-unit string
				prefixUnit += subParser.string.charAt(subParser.i);
				break;
		}
		subParser.i++;
		//return parser.string.slice(j, parser.i -1);
	}

	processPrefixUnitCombo(prefixUnit, unitPiece);
	unitPieces.push(unitPiece);
	// throw new TexError('MissingCloseBracket',
	// 'Could not find closing \']\' for argument to %1', parser.currentCS);

	return unitPieces;
}
