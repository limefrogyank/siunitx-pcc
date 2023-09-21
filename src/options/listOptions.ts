import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options";

export type ExponentsMode = 'individual' | 'combine-bracket' | 'combine';
type UnitsMode = 'repeat' | 'bracket' | 'single';
export type UnitsModeProduct = UnitsMode | 'bracket-power' | 'power';

export interface IListOptions{
    listCloseBracket: string;
    listOpenBracket: string;
    listExponents: ExponentsMode;
    listFinalSeparator: string;
    listPairSeparator: string;
    listSeparator: string;
    listUnits: UnitsMode;
    productCloseBracket: string;
    productOpenBracket: string;
    productExponents: ExponentsMode;
    productMode:'symbol'|'phrase';
    productPhrase: string;
    productSymbol: string;
    productUnits: UnitsModeProduct;
    rangeCloseBracket: string;
    rangeOpenBracket: string;
    rangeExponents: ExponentsMode;
    rangePhrase: string;
    rangeUnits: UnitsMode;
    
}
export const ListOptionDefaults: IListOptions = {
    listCloseBracket: ')',
    listOpenBracket: '(',
    listExponents: 'individual',
    listFinalSeparator: ', and ',
    listPairSeparator: ' and ',
    listSeparator: ', ',
    listUnits: 'repeat',
    productCloseBracket: ')',
    productOpenBracket: '(',
    productExponents: 'individual',
    productMode: 'symbol',
    productPhrase: ' by ',
    productSymbol: '\\times',
    productUnits: 'repeat',
    rangeCloseBracket: ')',
    rangeOpenBracket: '(',
    rangeExponents: 'individual',
    rangePhrase: ' to ',
    rangeUnits: 'repeat'
}



