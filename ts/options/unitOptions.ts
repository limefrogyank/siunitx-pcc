type PerMode = 'power' | 'fraction' | 'symbol' | 'power-positive-first' | 'repeated-symbol' | 'single-symbol' | 'perMode';
export type QualifierMode = 'subscript' | 'bracket' | 'combine' | 'phrase';

export interface IUnitOptions {
	"inter-unit-product": string;
	"per-mode": PerMode;
	"display-per-mode": PerMode;		// not implemented, global setting only
	"inline-per-mode": PerMode;			// not implemented, global setting only
	"per-symbol": string;
	"fraction-command": string;
	"bracket-unit-denominator": boolean;
	"per-symbol-script-correction": string;
	"sticky-per": boolean;
	"qualifier-mode": QualifierMode;
	"qualifier-phrase": string;
	"power-half-as-sqrt": boolean;
	"parse-units": boolean;
	"forbid-literal-units": boolean;
	"unit-font-command": string;
}

export const UnitOptionDefaults: IUnitOptions = {
	"bracket-unit-denominator": true,
	"forbid-literal-units": false,
	"fraction-command": '\\frac',
	"inter-unit-product": '\\,',
	"parse-units": true,
	"per-mode": 'power',
	"display-per-mode": 'perMode',
	"inline-per-mode": 'perMode',
	"per-symbol-script-correction": '\\!',
	"per-symbol": '/',
	"power-half-as-sqrt": false,
	"qualifier-mode": 'subscript',
	"qualifier-phrase": '',
	"sticky-per": false,
	"unit-font-command": '\\mathrm'
}