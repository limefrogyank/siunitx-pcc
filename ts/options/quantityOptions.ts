import { INumOptions, NumOptionDefaults } from "./numberOptions";
import { IUnitOptions, UnitOptionDefaults } from "./unitOptions";

export type PrefixMode = 'input' | 'combine-exponent' | 'extract-exponent';
export type SeparateUncertaintyUnits = 'bracket' | 'repeat' | 'single';

export interface IQuantityOptions extends INumOptions, IUnitOptions {
	"allow-quantity-breaks": boolean; 			// not implemented, // TODO: allowQuantityBreaks: Check that this can't really be done with MathJax
	"extract-mass-in-kilograms": boolean;
	"prefix-mode": PrefixMode;
	"quantity-product": '\\,';
	"separate-uncertainty-units": SeparateUncertaintyUnits;
}

export const QuantityOptionDefaults: IQuantityOptions = {
	...NumOptionDefaults,
	...UnitOptionDefaults,
	"allow-quantity-breaks": false,
	"extract-mass-in-kilograms": true,
	"prefix-mode": 'input',
	"quantity-product": '\\,',
	"separate-uncertainty-units": 'bracket'
}