export interface IComplexNumberOptions {
	"complex-angle-unit": 'degrees' | 'radians';
	"complex-mode": 'input' | 'cartesian' | 'polar';
	"complex-root-position": 'before-number' | 'after-number';
	"complex-symbol-angle": string;
	"complex-symbol-degree": string;
	"input-complex-root": string;
	"output-complex-root": string;
	"print-complex-unity": boolean;
}

export const ComplexNumberOptionsDefault: IComplexNumberOptions = {
	"complex-angle-unit": 'degrees',
	"complex-mode": 'input',
	"complex-root-position": 'after-number',
    "complex-symbol-angle": '\\angle',
    "complex-symbol-degree": '\\degree',
    "input-complex-root": 'ij',
    "output-complex-root": '\\mathrm{i}',
    "print-complex-unity": false
}