import { INumOptions, NumOptionDefaults } from "./numberOptions";

type AngleMode = 'input' | 'arc' | 'decimal';

// since angles use the same system number processing system, it extends the INumOptions
export interface IAngleOptions extends INumOptions {
	"angle-mode": AngleMode;
	"angle-symbol-degree": string;
	"angle-symbol-minute": string;
	"angle-symbol-over-decimal": boolean;
	"angle-symbol-second": string;
	"angle-separator": string;
	"fill-angle-degrees": boolean;
	"fill-angle-minutes": boolean;
	"fill-angle-seconds": boolean;
	"number-angle-product": string;
}

export const AngleOptionDefaults: IAngleOptions = {
	...NumOptionDefaults,
	"angle-mode": 'input',
	"angle-symbol-degree": '\\degree',
	"angle-symbol-minute": "'", //'\\arcminute',
	"angle-symbol-over-decimal": false,
	"angle-symbol-second": "''",//'\\arcsecond',
	"angle-separator": '',
	"fill-angle-degrees": false,
	"fill-angle-minutes": false,
	"fill-angle-seconds": false,
	"number-angle-product": ''
}
