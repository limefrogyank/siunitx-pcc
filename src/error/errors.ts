import TexError from "mathjax-full/js/input/tex/TexError";
import * as data from "./resource.en.json";

export class siunitxError {

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
