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

}
