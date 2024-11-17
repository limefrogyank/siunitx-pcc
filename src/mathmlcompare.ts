// modified for typescript
/*!
 * DLMathMLCompare v1.0.0
 * https://github.com/doozielabs/DLMathMLCompare
 *
 * Copyright 2018 Doozie Labs
 * Released under the GPL v3.0 license
 */
export function mathmlcompare(mml1: string, mml2: string) {

	function simplifyMML(mml: string): string {

		return mml.replace(/(<[a-zA-Z]+)(.*?)(\/?>)/g, "$1$3")	// Remove attributes
				.replace(/(<mstyle>|<\/mstyle>)/g, "")			// Remove style tag
				.replace(/(&#xA0;|\s+)/g, " ")					// Convert space code to actual space character
				.replace(/<([a-zA-Z]+)>\s+<\/\1>/g, "")			// Remove sections that only contains spaces/tabs
				.replace(/(>)\s+|\s+(<)/g, "$1")				// Trim content in between tags
				.replace(/<([a-zA-Z]+)><\/\1>/g, "<$1/>");		// Convert empty tags into self closing tags

	}

	return simplifyMML(mml1) === simplifyMML(mml2);

}