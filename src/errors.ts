import TexError from "mathjax-full/js/input/tex/TexError";

// interface IError {
// 	code: string;
// 	message: string;
// }

// class Error implements IError{
// 	code: string;
// 	message: string;
// 	constructor(code:string, message:string){
// 		this.code = code;
// 		this.message = message;
// 	}
// }

export class siunitxError {
	
	
	static TooManySemicolonsInAngle = new TexError('101', 'There are two many semi-colons.  Should only be two at most.');

	static NoInterpretationForUnitMacro(macro:string) : TexError {
		return new TexError('102', 'The unit macro, ' + macro + ', has not been defined.');
	}

	static LiteralUnitsForbidden(macro:string) : TexError {
		return new TexError('103', macro + ' is detected as a literal units.  These are forbidden globally. Use interpreted units instead (i.e. \\kilo\\gram).');
	}

	static ExponentThresholdsError(option:string):TexError{
		return new TexError('104', 'Couldn\'t parse "' + option  + '".  Option "exponent-threshold" must be in the form of "min-number:max-number".');
	}

}
