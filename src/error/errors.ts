import TexError from "mathjax-full/js/input/tex/TexError";
import * as data from "./resource.en.json";



export class siunitxError {

	static InvalidNumArgument(arg: string): TexError {
		return new TexError('siunitx:invalidNumArgument', data.invalidNumArgument, arg);
	}

	static InvalidOptionValue(key: string, type:string): TexError {
		return new TexError('siunitx:InvalidOptionValue', data.invalidOptionValue, key, type)
	}

	static ComparatorAlreadySet(existing: string, toBeAdded: string): TexError {
		return new TexError('siunitx:comparatorAlreadySet', data.comparatorAlreadySet, existing, toBeAdded);
	}

	static TooManySemicolonsInAngle = new TexError('siunitx:extraSemicolon', data.extraSemicolon);

	static NoInterpretationForUnitMacro(macro: string): TexError {
		return new TexError('siunitx:macroNotDefined', data.macroNotDefined, macro);
	}

	static LiteralUnitsForbidden(macro: string): TexError {
		return new TexError('siunitx:literalUnitsForbidden', data.literalUnitsForbidden, macro);
	}

	static ExponentThresholdsError(option: string): TexError {
		return new TexError('sinunitx:exponentThresholdsError', data.exponentThresholdsError, option);
	}


}
