import TexParser from "mathjax-full/js/input/tex/TexParser";
import { INumberPiece, NumberPieceDefault, parseNumber, pieceToNumber } from "./numMethods";
import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import { IOptions, findOptions } from "./options/options";
import { GlobalParser } from "./siunitx";
import { postProcessNumber } from "./numPostProcessMethods";
import { displayOutputMml, findInnerText, spacerMap } from "./numDisplayMethods";
import { displayUnits, parseUnit } from "./unitMethods";
import { prefixModeMap } from "./qtyMethods";

export interface IComplex {
    real: INumberPiece;
    imaginary: INumberPiece;
    inputMode: 'cartesian' | 'polar'
}
const ComplexDefault: IComplex = {
    real: { ...NumberPieceDefault },
    imaginary: { ...NumberPieceDefault },
    inputMode: 'cartesian'
};

export function parseComplexNumber(parser: TexParser, text: string, options: IOptions): IComplex {
    // console.log("Complex text: ");
    // console.log(text);

    const complex = { ...ComplexDefault };
    // Check if polar input
    if (text.includes(':')) {
        complex.inputMode = 'polar';
        // parse polar
        const regex = /(.+):(.+)/;
        const matches = text.match(regex);
        complex.real = parseNumber(parser, matches[1], options);
        complex.imaginary = parseNumber(parser, matches[2], options);
    } else {
        // parse cartesian
        // check if imaginary part exists
        const imaginaryTokenRegex = new RegExp(`[${options.inputComplexRoot}]`);
        if (text.match(imaginaryTokenRegex)) {
            // identify splitter and split parts
            const regexSplit = /[+-](?![^+-]*[+-])/;
            const sign = text.match(regexSplit);
            const split = text.split(regexSplit);
            if (split.length > 1) {
                complex.real = parseNumber(parser, split[0], options);
                //remove imaginary token, add sign, and parse
                let value = split[1].replace(imaginaryTokenRegex, '').trim();
                if (value === '') {
                    value = '1';
                }
                complex.imaginary = parseNumber(parser, sign + value, options);
            } else {
                // here because positive imaginary only number was used... i.e. 2i
                let value = split[0].replace(imaginaryTokenRegex, '');
                if (value === '') {
                    value = '1';
                }
                complex.imaginary = parseNumber(parser, value, options);
            }

        } else {
            // edge case: only real
            complex.real = parseNumber(parser, text, options);
        }

    }

    return complex;
}

function cartesianToPolar(parser: TexParser, complex: IComplex, options: IOptions, useDegrees: boolean = true): void {
    const x = pieceToNumber(complex.real);
    const y = pieceToNumber(complex.imaginary)
    const r = Math.hypot(x, y);
    let ang = Math.atan2(y, x);
    if (useDegrees) {
        ang = ang / 2 / Math.PI * 360;
    }
    complex.real = parseNumber(parser, r.toString(), options);
    complex.imaginary = parseNumber(parser, ang.toString(), options);
}

function polarToCartesian(parser: TexParser, complex: IComplex, options: IOptions, inputDegrees: boolean = true): void {
    const r = pieceToNumber(complex.real);
    let ang = pieceToNumber(complex.imaginary);
    if (inputDegrees) {
        ang = ang * 2 * Math.PI / 360;
    }
    const x = r * Math.cos(ang);
    const y = r * Math.sin(ang);
    
    complex.real = parseNumber(parser, x.toString(), options);
    complex.imaginary = parseNumber(parser, y.toString(), options);
}

function displayComplexNumber(complex: IComplex, parser: TexParser, options: IOptions): MmlNode[]{
    const realMmlNodes = displayOutputMml(complex.real, parser, options);

        const rootNodes: MmlNode[] = [];
        realMmlNodes.forEach(n => {
            rootNodes.push(n);
        })

        const complexValue = pieceToNumber(complex.imaginary);
        if (complexValue !== 0) {
            if (complex.inputMode === 'polar' && options.complexMode === 'input' || options.complexMode === 'polar') {
                const angle = (new TexParser(options.complexSymbolAngle, parser.stack.env, parser.configuration)).mml();
                rootNodes.push(angle);

                
                const complexMmlNodes = displayOutputMml(complex.imaginary, parser, options);
                complexMmlNodes.forEach(n => {
                    rootNodes.push(n);
                });
            
                if (options.complexAngleUnit === 'degrees'){
                    const degree = (new TexParser(options.complexSymbolDegree, parser.stack.env, parser.configuration)).mml();
                    rootNodes.push(degree);
                }

            } else {
                // extract sign from imaginary part
                const sign = complex.imaginary.sign === '-' ? '-' : '+';
                complex.imaginary.sign = '';

                if (pieceToNumber(complex.real) !== 0 || sign === '-') {
                    const signNode = (new TexParser(sign, parser.stack.env, parser.configuration)).mml();
                    rootNodes.push(signNode);
                }

                if (options.complexRootPosition === 'before-number') {
                    const rootNode = (new TexParser(options.outputComplexRoot, parser.stack.env, parser.configuration)).mml();
                    rootNodes.push(rootNode);
                }

                if (complexValue !== 1 || options.printComplexUnity){
                    const complexMmlNodes = displayOutputMml(complex.imaginary, parser, options);
                    complexMmlNodes.forEach(n => {
                        rootNodes.push(n);
                    });
                }

                if (options.complexRootPosition === 'after-number') {
                    const rootNode = (new TexParser(options.outputComplexRoot, parser.stack.env, parser.configuration)).mml();
                    rootNodes.push(rootNode);
                }
            }
        }

        return rootNodes;

}

export function processComplexNumber(parser: TexParser): MmlNode[] {
    const globalOptions: IOptions = { ...parser.options as IOptions };

    const localOptions = findOptions(parser);

    Object.assign(globalOptions, localOptions);

    const text = parser.GetArgument('complexnum');

    if (globalOptions.parseNumbers) {

        const complex = parseComplexNumber(parser, text, globalOptions);

        if (globalOptions.complexMode === 'polar' && complex.inputMode !== 'polar') {
            cartesianToPolar(parser, complex, globalOptions, globalOptions.complexAngleUnit === 'degrees');
        } else if (globalOptions.complexMode === 'cartesian' && complex.inputMode !== 'cartesian') {
            polarToCartesian(parser, complex, globalOptions, globalOptions.complexAngleUnit === 'degrees');
        }

        postProcessNumber(complex.real, globalOptions);
        postProcessNumber(complex.imaginary, globalOptions);

       return displayComplexNumber(complex, parser, globalOptions);

    } else {
        const mml = (new TexParser(text, parser.stack.env, parser.configuration)).mml();
        return [mml];
    }

}

export function processComplexQuantity(parser: TexParser): void {
    const globalOptions: IOptions = { ...parser.options as IOptions };

    const localOptions = findOptions(parser);

    Object.assign(globalOptions, localOptions);

    const complexnum = parser.GetArgument('complexnum');
    const unitString = parser.GetArgument('unit');

    let unitDisplay = '';

	const isLiteral = (unitString.indexOf('\\') === -1);
	const unitPieces = parseUnit(parser, unitString, globalOptions, localOptions, isLiteral);

    
    const complex = parseComplexNumber(parser, complexnum, globalOptions);

    if (globalOptions.complexMode === 'polar' && complex.inputMode !== 'polar') {
        cartesianToPolar(parser, complex, globalOptions);
    } else if (globalOptions.complexMode === 'cartesian' && complex.inputMode !== 'cartesian') {
        polarToCartesian(parser, complex, globalOptions);
    }

    // convert number and unit if necessary
    prefixModeMap.get(globalOptions.prefixMode)?.(complex.real, unitPieces, globalOptions);
    prefixModeMap.get(globalOptions.prefixMode)?.(complex.imaginary, unitPieces, globalOptions);

    postProcessNumber(complex.real, globalOptions);
    postProcessNumber(complex.imaginary, globalOptions);

   
	const complexNumMml = displayComplexNumber( complex, parser, globalOptions);
    complexNumMml.forEach(v=>{
        parser.Push(v);
    });

    let quantityProductNode = null;
    const trimmedQuantityProduct = globalOptions.quantityProduct.trimStart();
    if (trimmedQuantityProduct !== '') {
        let quantityProduct = spacerMap[trimmedQuantityProduct];
        if (quantityProduct === undefined) {
            // instead of copying quantityProduct, 
            // should auto parse latex and extract unicode from mml
            const spacerNode = (new TexParser(quantityProduct, GlobalParser.stack.env, GlobalParser.configuration)).mml();
            quantityProduct = findInnerText(spacerNode);
        }
        quantityProductNode = parser.create('token', 'mo', {}, quantityProduct);
    }
    parser.Push(quantityProductNode);

        // Need to process this after number because some options alter unit prefixes
    unitDisplay = displayUnits(parser, unitPieces, globalOptions, isLiteral);
    const unitNode = (new TexParser(unitDisplay, parser.stack.env, parser.configuration)).mml();

    parser.Push(unitNode);

 
}
