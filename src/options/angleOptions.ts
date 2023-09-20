import { INumOptions, NumOptionDefaults } from "./numberOptions";

type AngleMode = 'input' | 'arc' | 'decimal';

// since angles use the same system number processing system, it extends the INumOptions
export interface IAngleOptions extends INumOptions {
	angleMode: AngleMode;
	angleSymbolDegree: string;
	angleSymbolMinute: string;
	angleSymbolOverDecimal: boolean;
	angleSymbolSecond: string;
	angleSeparator: string;
	fillAngleDegrees: boolean;
	fillAngleMinutes: boolean;
	fillAngleSeconds: boolean;
	numberAngleProduct: string;
}

export const AngleOptionDefaults: IAngleOptions = {
	...NumOptionDefaults,
	angleMode: 'input',
	angleSymbolDegree: '\\degree',
	angleSymbolMinute: "'", //'\\arcminute',
	angleSymbolOverDecimal: false,
	angleSymbolSecond: "''",//'\\arcsecond',
	angleSeparator: '',
	fillAngleDegrees: false,
	fillAngleMinutes: false,
	fillAngleSeconds: false,
	numberAngleProduct: ''
}
