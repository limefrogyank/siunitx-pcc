import { INumOptions, NumOptionDefaults } from "./numberOptions";
import { IUnitOptions, UnitOptionDefaults } from "./unitOptions";

export type PrefixMode = 'input' | 'combine-exponent' | 'extract-exponent';
export type SeparateUncertaintyUnits = 'bracket' | 'repeat' | 'single';

export interface IQuantityOptions extends INumOptions, IUnitOptions {
	allowQuantityBreaks: boolean; 			// not implemented, // TODO: allowQuantityBreaks: Check that this can't really be done with MathJax
	extractMassInKilograms: boolean;
	prefixMode: PrefixMode;
	quantityProduct: '\\,';
	separateUncertaintyUnits: SeparateUncertaintyUnits;
}

export const QuantityOptionDefaults: IQuantityOptions = {
	...NumOptionDefaults,
	...UnitOptionDefaults,
	allowQuantityBreaks: false,
	extractMassInKilograms: true,
	prefixMode: 'input',
	quantityProduct: '\\,',
	separateUncertaintyUnits: 'bracket'
}