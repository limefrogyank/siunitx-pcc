export type ExponentsMode = 'individual' | 'combine-bracket' | 'combine';
type UnitsMode = 'repeat' | 'bracket' | 'single';
export type UnitsModeProduct = UnitsMode | 'bracket-power' | 'power';

export interface IListOptions {
    "list-close-bracket": string;
    "list-open-bracket": string;
    "list-exponents": ExponentsMode;
    "list-final-separator": string;
    "list-pair-separator": string;
    "list-separator": string;
    "list-units": UnitsMode;
    "product-close-bracket": string;
    "product-open-bracket": string;
    "product-exponents": ExponentsMode;
    "product-mode": 'symbol' | 'phrase';
    "product-phrase": string;
    "product-symbol": string;
    "product-units": UnitsModeProduct;
    "range-close-bracket": string;
    "range-open-bracket": string;
    "range-exponents": ExponentsMode;
    "range-phrase": string;
    "range-units": UnitsMode;

}
export const ListOptionDefaults: IListOptions = {
    "list-close-bracket": ')',
    "list-open-bracket": '(',
    "list-exponents": 'individual',
    "list-final-separator": ', and ',
    "list-pair-separator": ' and ',
    "list-separator": ', ',
    "list-units": 'repeat',
    "product-close-bracket": ')',
    "product-open-bracket": '(',
    "product-exponents": 'individual',
    "product-mode": 'symbol',
    "product-phrase": ' by ',
    "product-symbol": '\\times',
    "product-units": 'repeat',
    "range-close-bracket": ')',
    "range-open-bracket": '(',
    "range-exponents": 'individual',
    "range-phrase": ' to ',
    "range-units": 'repeat'
}



