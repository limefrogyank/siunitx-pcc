type PerMode = 'power' | 'fraction' | 'symbol' | 'power-positive-first' | 'repeated-symbol' | 'single-symbol' | 'perMode';
export type QualifierMode = 'subscript' | 'bracket' | 'combine' | 'phrase';

export interface IUnitOptions {
	interUnitProduct: string;
	perMode: PerMode;
	displayPerMode: PerMode;		// not implemented, global setting only
	inlinePerMode: PerMode;			// not implemented, global setting only
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