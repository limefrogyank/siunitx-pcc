import TexParser from "mathjax-full/js/input/tex/TexParser";
import ParseUtil from 'mathjax-full/js/input/tex/ParseUtil';
import { IUnitOptions, UnitOptionDefaults } from "./unitOptions";
import { INumOptions, NumOptionDefaults } from "./numberOptions";
import { IAngleOptions, AngleOptionDefaults } from "./angleOptions";
import { IQuantityOptions, QuantityOptionDefaults } from "./quantityOptions";
import { IPrintOptions, PrintOptionsDefault } from "./printOptions";
import { IComplexNumberOptions, ComplexNumberOptionsDefault } from "./complexNumberOptions";
import { IListOptions, ListOptionDefaults } from "./listOptions";
import { siunitxError } from "../error/errors";
import "./patch.js";
import { EnvList } from "mathjax-full/js/input/tex/StackItem";


export interface IOptions extends IUnitOptions, INumOptions, IAngleOptions, IQuantityOptions, IComplexNumberOptions, IPrintOptions, IListOptions { }

export const siunitxDefaults = {
	...UnitOptionDefaults,
	...NumOptionDefaults,
	...AngleOptionDefaults,
	...QuantityOptionDefaults,
	...ComplexNumberOptionsDefault,
	...PrintOptionsDefault,
	...ListOptionDefaults
};

// originally this function contained a manual version of getting options inside brackets... not necessary anymore
export function findOptions(parser: TexParser, globalOptions: IOptions): Partial<IOptions> {
	// No good way to extend typing for patch
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return optionStringToObject((parser as any).GetBrackets(parser.currentCS, undefined, true), globalOptions);
}

// // from https://stackoverflow.com/a/10425344/1938624
// function dashToCamel(input: string): string {
// 	return input.toLowerCase().replace(/-(.)/g, (match, group) => {
// 		return group.toUpperCase();
// 	});
// }

// // from https://stackoverflow.com/a/47932848/1938624
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// function camelToDash(str: string): string {
// 	return str.replace(/([A-Z])/g, ($1) => { return "-" + $1.toLowerCase(); });
// }

export function processSISetup(parser: TexParser): void {
	const globalOptions: IOptions = { ...parser.options.siunitx as IOptions };

	const optionsString = parser.GetArgument('sisetup');

	const options = optionStringToObject(optionsString, globalOptions);
	Object.assign(parser.options.siunitx, options);

	// We are adding the sisetup options to the parser options.  These are global once the page is loaded.
	// (the globalOptions variable is just a copy and will reset between each siunitx command)

	// In LaTeX, you can limit these options to grouping curly braces.
	// For MathJAx, you just need to write new delimiters for text: $$ ... $$ 
}

// LaTeX commands (in the value portion) MUST end with a space before using a comma to add another option
function optionStringToObject(optionString: string, globalOptions: IOptions): Partial<IOptions> {
	// No good way to extend typing for patch
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const optionObject: EnvList = (ParseUtil.keyvalOptions as any)(optionString, globalOptions as unknown as { [key: string]: number }, true, true);
	const options: Partial<IOptions> = {};
	for (let [key, value] of Object.entries(optionObject)) {
		const type = typeof globalOptions[key];
		if (typeof value !== type) {
			if (type === 'number' && value.toString().match(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]\d+)?$/)) {
				value = parseFloat(value.toString());
			} else {
				throw siunitxError.InvalidOptionValue(key, type);
			}
		}
		options[key] = value;
	}

	return options;
}