import { MmlNode } from "mathjax-full/js/core/MmlTree/MmlNode";
import TexParser from "mathjax-full/js/input/tex/TexParser";
import { IOptions, findOptions } from "./options";

type ExponentsMode = 'individual' | 'combine-bracket' | 'combine';
type UnitsMode = 'repeat' | 'bracket' | 'single';

export interface IListOptions{
    listExponents: ExponentsMode;
    listFinalSeparator: string;
    listPairSeparator: string;
    listSeparator: string;
    listUnits: UnitsMode;
    productExponents: ExponentsMode;
    productMode:'symbol'|'phrase';
    productPhrase: string;
    productSymbol: string;
    productUnits: UnitsMode;
    rangeExponents: ExponentsMode;
    rangePhrase: string;
    rangeUnits: UnitsMode;
    
}
export const ListOptionDefaults: IListOptions = {
    listExponents: 'individual',
    listFinalSeparator: ', and ',
    listPairSeparator: ' and ',
    listSeparator: ', ',
    listUnits: 'repeat',
    productExponents: 'individual',
    productMode: 'symbol',
    productPhrase: ' by ',
    productSymbol: '\\times',
    productUnits: 'repeat',
    rangeExponents: 'individual',
    rangePhrase: ' to ',
    rangeUnits: 'repeat'
}



