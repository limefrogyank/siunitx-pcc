import TexError from "mathjax-full/js/input/tex/TexError";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { defaultOptions } from "mathjax-full/js/util/Options";
import { IUnitOptions, UnitOptionDefaults } from "./unitOptions";
import { INumOptions, NumOptionDefaults } from "./numberOptions";
import { IAngleOptions, AngleOptionDefaults } from "./angleOptions";
import { IQuantityOptions, QuantityOptionDefaults } from "./quantityOptions";
import { IPrintOptions, PrintOptionsDefault } from "./printOptions";
import { IComplexNumberOptions, ComplexNumberOptionsDefault } from "./complexNumberOptions";
import { IListOptions, ListOptionDefaults } from "./listOptions";


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
export function findOptions(parser: TexParser): Partial<IOptions> {
	return optionStringToObject(parser.GetBrackets(parser.currentCS));
}

// from https://stackoverflow.com/a/10425344/1938624
function dashToCamel(input: string): string {
	return input.toLowerCase().replace(/-(.)/g, (match, group) => {
		return group.toUpperCase();
	});
}

// from https://stackoverflow.com/a/47932848/1938624
function camelToDash(str: string): string {
	return str.replace(/([A-Z])/g, ($1) => { return "-" + $1.toLowerCase(); });
}

export function processSISetup(parser: TexParser): void {
	let globalOptions: IOptions = { ...parser.options as IOptions };

	const optionsString = parser.GetArgument('sisetup');

	const options = processOptions(globalOptions, optionsString);
	options.forEach((v, k) => parser.options[k] = v);

	// We are adding the sisetup options to the parser options.  These are global once the page is loaded.
	// (the globalOptions variable is just a copy and will reset between each siunitx command)

	// TODO: Figure out a how to limit these to grouping curly braces. 
	// For now, you'll have to reset the options manually with another sisetup command.	

}

function optionStringToObject( optionString: string):Partial<IOptions>{
	const options : Partial<IOptions> = {};
	if (optionString != null) {
		// check if wrapped in curly braces and remove them
		while (optionString.startsWith('{') && optionString.endsWith('}')) {
			optionString = optionString.slice(1, optionString.length - 1);
		}
		let prop = '';
		let onValue = false;
		let depth = 0;
		let escaped = false;
		let value = '';
		for (const c of optionString) {
			if (c == '{') {
				if (onValue) {
					value += c;
				} else {
					prop += c;
				}
				depth++;
			}
			else if (c == '}') {
				depth--;
				if (onValue) {
					value += c;
				} else {
					prop += c;
				}
			}
			else if (c == '\\') {
				escaped = true;
				if (onValue) {
					value += c;
				} else {
					prop += c;
				}
			}
			else if (c == ',' && depth == 0 && !escaped) {
				prop = dashToCamel(prop.trim());
				if (value == '') {
					options[prop] = true;
				}
				else if (typeof siunitxDefaults[prop] === 'number') {
					options[prop] = +(value.trim());
				} else if (typeof siunitxDefaults[prop] === 'boolean') {
					options[prop] = (value.trim() === 'true');
				} else {
					if (value.indexOf('\\') == -1) {
						value = value.trim();
						// finally, remove curly brackets around value if present
						value = value.replace(/^{(.*)}$/g, '$1');
					}
					options[prop] = value;
				}
				prop = '';
				value = '';
				onValue = false;
			}
			else if (c == '=' && depth == 0) {
				onValue = true;
			}
			else {
				if (onValue) {
					if (c == ' ' && escaped) {
						escaped = false;
					}
					value += c;
				} else {
					prop += c;
				}
			}
		}
		prop = dashToCamel(prop.trim());
		
		if (value == '') {
			options[prop] = true;
		}
		else if (typeof siunitxDefaults[prop] === 'number') {
			options[prop] = +(value.trim());
		} else if (typeof siunitxDefaults[prop] === 'boolean') {
			options[prop] = (value.trim() === 'true');
		} else {
			if (value.indexOf('\\') == -1) {
				value = value.trim();
				// finally, remove curly brackets around value if present
				value = value.replace(/^{(.*)}$/g, '$1');
			}
			options[prop] = value;
		}
	}
	return options;
}

// LaTeX commands (in the value portion) MUST end with a space before using a comma to add another option
export function processOptions(globalOptions: IOptions, optionString: string): Map<string, any> {
	const options = new Map<string, any>();

	if (optionString != null) {
		// check if wrapped in curly braces and remove them
		while (optionString.startsWith('{') && optionString.endsWith('}')) {
			optionString = optionString.slice(1, optionString.length - 1);
		}
		let prop = '';
		let onValue = false;
		let depth = 0;
		let escaped = false;
		let value = '';
		for (const c of optionString) {
			if (c == '{') {
				if (onValue) {
					value += c;
				} else {
					prop += c;
				}
				depth++;
			}
			else if (c == '}') {
				depth--;
				if (onValue) {
					value += c;
				} else {
					prop += c;
				}
			}
			else if (c == '\\') {
				escaped = true;
				if (onValue) {
					value += c;
				} else {
					prop += c;
				}
			}
			else if (c == ',' && depth == 0 && !escaped) {
				prop = dashToCamel(prop.trim());
				//console.log(prop + ': ' + value);
				if (value == '') {
					//globalOptions[prop] = true;
					options.set(prop, true);
				}
				else if (typeof globalOptions[prop] === 'number') {
					//globalOptions[prop] = +(value.trim());
					options.set(prop, +(value.trim()));
				} else if (typeof globalOptions[prop] === 'boolean') {
					//globalOptions[prop] = (value.trim() === 'true');
					options.set(prop, (value.trim() === 'true'));
				} else {
					if (value.indexOf('\\') == -1) {
						value = value.trim();
						// finally, remove curly brackets around value if present
						value = value.replace(/^{(.*)}$/g, '$1');
					}
					//globalOptions[prop] = value;
					options.set(prop, value);
				}
				prop = '';
				value = '';
				onValue = false;
			}
			else if (c == '=' && depth == 0) {
				onValue = true;
			}
			else {
				if (onValue) {
					if (c == ' ' && escaped) {
						escaped = false;
					}
					value += c;
				} else {
					prop += c;
				}
			}
		}

		prop = dashToCamel(prop.trim());
		//console.log(prop + ': ' + value);
		if (value == '') {
			//globalOptions[prop] = true;
			options.set(prop, true);
		}
		else if (typeof globalOptions[prop] === 'number') {
			//globalOptions[prop] = +(value.trim());
			options.set(prop, +(value.trim()));
		} else if (typeof globalOptions[prop] === 'boolean') {
			//globalOptions[prop] = (value.trim() === 'true');
			options.set(prop, (value.trim() === 'true'));
		} else {
			if (value.indexOf('\\') == -1) {
				value = value.trim();
				// finally, remove curly brackets around value if present
				value = value.replace(/^{(.*)}$/g, '$1');
			}
			//globalOptions[prop] = value;
			options.set(prop, value);
		}
	}

	return options;

}