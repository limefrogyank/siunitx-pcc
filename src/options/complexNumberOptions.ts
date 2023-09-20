export interface IComplexNumberOptions {
	complexAngleUnit: 'degrees' | 'radians';
	complexMode: 'input' | 'cartesian' | 'polar';
	complexRootPosition: 'before-number' | 'after-number';
	complexSymbolAngle: string;
	complexSymbolDegree: string;
	inputComplexRoot: string;
	outputComplexRoot: string;
	printComplexUnity: boolean;
}

export const ComplexNumberOptionsDefault: IComplexNumberOptions = {
	complexAngleUnit: 'degrees',
	complexMode: 'input',
	complexRootPosition: 'after-number',
    complexSymbolAngle: '\\angle',
    complexSymbolDegree: '\\degree',
    inputComplexRoot: 'ij',
    outputComplexRoot: '\\mathrm{i}',
    printComplexUnity: false
}