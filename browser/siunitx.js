/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 131
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.generateAnglePiece = generateAnglePiece;
exports.processAngle = processAngle;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const errors_1 = __webpack_require__(705);
const numDisplayMethods_1 = __webpack_require__(85);
const numMethods_1 = __webpack_require__(703);
const options_1 = __webpack_require__(878);
// Can't splat default otherwise references gets copied.  Need to construct it freshly.
function generateAnglePiece() {
    const ang = {
        degrees: (0, numMethods_1.generateNumberPiece)()
    };
    return ang;
}
function parseAngle(parser, text, options) {
    const ang = generateAnglePiece();
    let num = ang.degrees;
    const mapping = (0, numMethods_1.generateNumberMapping)(options);
    const subParser = new TexParser_js_1.default(text, parser.stack.env, parser.configuration);
    subParser.i = 0;
    // process character
    // if '\', then read until next '\' or whitespace char
    let token;
    while (subParser.i < subParser.string.length) {
        console.log(subParser.i + ": " + subParser.string);
        token = subParser.GetNext();
        subParser.i++; // GetNext() does not advance position unless skipping whitespace
        if (token === ';') {
            if (!ang.minutes) {
                ang.minutes = (0, numMethods_1.generateNumberPiece)();
                num = ang.minutes;
            }
            else if (!ang.seconds) {
                ang.seconds = (0, numMethods_1.generateNumberPiece)();
                num = ang.seconds;
            }
            else {
                throw errors_1.siunitxError.ExtraSemicolon;
            }
        }
        else {
            if (token === '\\') {
                token += subParser.GetCS();
            }
            try {
                mapping.get(token)(token, num);
            }
            catch (_a) {
                throw errors_1.siunitxError.InvalidAngArgument(subParser.string);
            }
        }
    }
    // copied directly from parseNumber, this can be applied to degrees only most likely?
    // TODO: This duplicates some code... clean up?
    if (!options["retain-explicit-decimal-marker"] && ang.degrees.decimal !== '' && ang.degrees.fractional === '') {
        ang.degrees.decimal = '';
    }
    if (!options["retain-explicit-plus"] && ang.degrees.sign === '+') {
        ang.degrees.sign = '';
    }
    const value = +(ang.degrees.whole + (ang.degrees.decimal !== '' ? '.' : '') + ang.degrees.fractional);
    if (value === 0 && !options["retain-negative-zero"] && ang.degrees.sign === '-') {
        ang.degrees.sign = '';
    }
    return ang;
}
function convertToArc(ang) {
    if (ang.minutes || ang.seconds) {
        // already arc format
        return;
    }
    // This ignores exponents.
    if (!ang.degrees.decimal) {
        const firstFraction = +('0.' + ang.degrees.fractional);
        ang.degrees.fractional = '';
        ang.degrees.decimal = '';
        if (firstFraction !== 0) {
            const minutes = firstFraction * 60;
            ang.minutes = (0, numMethods_1.generateNumberPiece)();
            ang.minutes.whole = Math.floor(minutes).toString();
            const splitMinutes = (minutes + '').split('.');
            if (splitMinutes.length > 1) {
                const seconds = +('.' + splitMinutes[1]) * 60;
                ang.seconds = (0, numMethods_1.generateNumberPiece)();
                ang.seconds.whole = Math.floor(seconds).toString();
                const splitSeconds = (seconds + '').split('.');
                if (splitSeconds.length > 1) {
                    ang.seconds.decimal = '.';
                    ang.seconds.fractional = splitSeconds[1];
                }
            }
        }
    }
}
function convertToDecimal(ang) {
    let value = 0;
    if (ang.seconds && ang.seconds !== null) {
        value = +ang.seconds.whole / 60;
        delete ang.seconds;
    }
    if (ang.minutes && ang.minutes !== null) {
        value = (+ang.minutes.whole + value) / 60;
        delete ang.minutes;
    }
    value = (+ang.degrees.whole + value);
    const split = (value + '').split('.');
    ang.degrees.whole = split[0];
    if (split.length > 1) {
        ang.degrees.decimal = '.';
        ang.degrees.fractional = split[1];
    }
}
function degreeOverDecimal(parser, inputNode, symbolToUse, options, accent) {
    let degreeNodeToAdd = undefined;
    // decimal will be in first mn node
    const mnNodes = inputNode.findNodes('mn');
    if (mnNodes && mnNodes.length > 0) {
        const numNode = mnNodes[0];
        const textNode = numNode.childNodes[0];
        const split = textNode.getText().split(options["output-decimal-marker"]);
        if (split.length > 1) { // does contain decimal
            const replacementNode = parser.create('node', 'inferredMrow', [], {});
            replacementNode.appendChild(parser.create('token', 'mn', {}, split[0]));
            const mover = parser.create('node', 'mover', [], { "accent": accent });
            replacementNode.appendChild(mover);
            mover.appendChild(parser.create('token', 'mo', {}, '.'));
            mover.appendChild((new TexParser_js_1.default('\\class{MathML-Unit}{\\mathrm{' + symbolToUse + '}}', parser.stack.env, parser.configuration)).mml());
            replacementNode.appendChild(parser.create('token', 'mn', {}, split[1]));
            const parent = numNode.parent;
            parent.replaceChild(replacementNode, numNode);
            degreeNodeToAdd = inputNode;
        }
    }
    return degreeNodeToAdd;
}
const modeMapping = new Map([
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    ['input', () => { }], // do nothing
    ['arc', convertToArc],
    ['decimal', convertToDecimal]
]);
function displayAngleMml(parser, ang, options) {
    var _a, _b, _c;
    const root = parser.create('node', 'mrow', [], { fake: 'argument' });
    const degreeValue = +(ang.degrees.whole + (ang.degrees.decimal !== '' ? '.' : '') + ang.degrees.fractional);
    if (!ang.degrees.whole && options["fill-angle-degrees"]) {
        if (((_a = ang.minutes) === null || _a === void 0 ? void 0 : _a.sign) === '-') {
            ang.degrees.sign = '-';
            ang.minutes.sign = '';
        }
        else if (((_b = ang.seconds) === null || _b === void 0 ? void 0 : _b.sign) === '-') {
            ang.degrees.sign = '-';
            ang.seconds.sign = '';
        }
        ang.degrees.whole = '0';
    }
    let degreeNodeToAdd = undefined;
    if (degreeValue !== 0 || ang.degrees.whole === '0' || options["fill-angle-degrees"]) {
        const degreeMml = (0, numDisplayMethods_1.displayNumberMml)(ang.degrees, parser, options);
        if (options["angle-symbol-over-decimal"]) {
            // TODO: assume no exponents, maybe check for this and thow error
            degreeNodeToAdd = degreeOverDecimal(parser, degreeMml, options["angle-symbol-degree"], options, true);
        }
        if (!degreeNodeToAdd) {
            console.log("degree node is null and will be created");
            console.log(degreeValue);
            // do nothing but add symbol to end
            degreeNodeToAdd = parser.create('node', 'inferredMrow', [], {});
            degreeNodeToAdd.appendChild(degreeMml);
            degreeNodeToAdd.appendChild((new TexParser_js_1.default(options["number-angle-product"] + '\\class{MathML-Unit}{\\mathrm{' + options["angle-symbol-degree"] + '}}', parser.stack.env, parser.configuration)).mml());
        }
    }
    let minuteNodeToAdd = undefined;
    if (ang.minutes !== undefined && ang.minutes !== null) {
        const minutesValue = +(ang.minutes.whole + (ang.minutes.decimal !== '' ? '.' : '') + ang.minutes.fractional);
        let moddedAngleSymbolMinute = '\\mathrm{' + options["angle-symbol-minute"] + '}';
        if (moddedAngleSymbolMinute === "\\mathrm{'}") {
            // TODO: Localize the degree-minutes
            if (minutesValue === 1)
                moddedAngleSymbolMinute = '\\arialabel{degree-minute}{\\degreeminute}';
            else
                moddedAngleSymbolMinute = '\\arialabel{degree-minutes}{\\degreeminute}';
        }
        if (minutesValue !== 0 || ang.minutes.whole === '0' || options["fill-angle-minutes"]) {
            if (minutesValue === 0 && options["fill-angle-minutes"]) {
                if (((_c = ang.seconds) === null || _c === void 0 ? void 0 : _c.sign) === '-') {
                    ang.minutes.sign = '-';
                    ang.seconds.sign = '';
                }
                ang.minutes.whole = '0';
            }
            const minutesMml = (0, numDisplayMethods_1.displayNumberMml)(ang.minutes, parser, options);
            if (options["angle-symbol-over-decimal"]) {
                //const number = displayNumber(ang.minutes, options);
                minuteNodeToAdd = degreeOverDecimal(parser, minutesMml, moddedAngleSymbolMinute, options, false);
            }
            if (!minuteNodeToAdd) {
                // do nothing but add symbol to end
                minuteNodeToAdd = parser.create('node', 'inferredMrow', [], {});
                minuteNodeToAdd.appendChild(minutesMml);
                minuteNodeToAdd.appendChild((new TexParser_js_1.default(options["number-angle-product"] + '\\class{MathML-Unit}{\\mathrm{' + moddedAngleSymbolMinute + '}}', parser.stack.env, parser.configuration)).mml());
            }
        }
    }
    let secondsNodeToAdd = undefined;
    if (ang.seconds && ang.seconds !== null) {
        const secondsValue = +(ang.seconds.whole + (ang.seconds.decimal ? '.' : '') + ang.seconds.fractional);
        let moddedAngleSymbolSecond = '\\mathrm{' + options["angle-symbol-second"] + '}';
        if (moddedAngleSymbolSecond === "\\mathrm{''}") {
            // TODO: Localize the degree-seconds
            if (secondsValue === 1)
                moddedAngleSymbolSecond = '\\arialabel{degree-second}{\\degreesecond}';
            else
                moddedAngleSymbolSecond = '\\arialabel{degree-seconds}{\\degreesecond}';
        }
        if (secondsValue !== 0 || ang.seconds.whole === '0' || options["fill-angle-seconds"]) {
            if (secondsValue === 0 && options["fill-angle-seconds"]) {
                ang.seconds.whole = '0';
            }
            const secondsMml = (0, numDisplayMethods_1.displayNumberMml)(ang.seconds, parser, options);
            if (options["angle-symbol-over-decimal"]) {
                //const number = displayNumberMml(ang.seconds, parser, options);
                secondsNodeToAdd = degreeOverDecimal(parser, secondsMml, moddedAngleSymbolSecond, options, false);
            }
            if (!secondsNodeToAdd) {
                // do nothing but add symbol to end
                secondsNodeToAdd = parser.create('node', 'inferredMrow', [], {});
                secondsNodeToAdd.appendChild(secondsMml);
                secondsNodeToAdd.appendChild((new TexParser_js_1.default(options["number-angle-product"] + '\\class{MathML-Unit}{\\mathrm{' + moddedAngleSymbolSecond + '}}', parser.stack.env, parser.configuration)).mml());
            }
        }
    }
    if (degreeNodeToAdd) {
        root.appendChild(degreeNodeToAdd);
    }
    if (degreeNodeToAdd && (minuteNodeToAdd || secondsNodeToAdd) && options["angle-separator"] !== '') {
        root.appendChild((new TexParser_js_1.default(options["angle-separator"], parser.stack.env, parser.configuration)).mml());
    }
    if (minuteNodeToAdd) {
        root.appendChild(minuteNodeToAdd);
    }
    if (minuteNodeToAdd && secondsNodeToAdd && options["angle-separator"] !== '') {
        root.appendChild((new TexParser_js_1.default(options["angle-separator"], parser.stack.env, parser.configuration)).mml());
    }
    if (secondsNodeToAdd) {
        root.appendChild(secondsNodeToAdd);
    }
    return root;
}
function processAngle(parser) {
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    const text = parser.GetArgument('ang');
    const ang = parseAngle(parser, text, globalOptions);
    // TODO: consider error checking result
    // Is there an exponent??  Throw an error... or ignore it?
    // transform angle format
    modeMapping.get(globalOptions["angle-mode"])(ang);
    const mml = displayAngleMml(parser, ang, globalOptions);
    console.log(mml);
    return mml;
}
//# sourceMappingURL=angMethods.js.map

/***/ },

/***/ 331
(__unused_webpack_module, exports, __webpack_require__) {


// Modified!
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GetArgumentMML = void 0;
const NodeUtil_js_1 = __importDefault(__webpack_require__(180));
/**
 * Parses the math argument of the above commands and returns it as single
 * node (in an mrow if necessary). The HTML attributes are then
 * attached to this element.
 * @param {TexParser} parser The calling parser.
 * @param {string} name The calling macro name.
 * @return {MmlNode} The math node.
 */
const GetArgumentMML = function (parser, name) {
    const arg = parser.ParseArg(name);
    if (!NodeUtil_js_1.default.isInferred(arg)) {
        return arg;
    }
    const children = NodeUtil_js_1.default.getChildren(arg);
    if (children.length === 1) {
        return children[0];
    }
    const mrow = parser.create("node", "mrow");
    NodeUtil_js_1.default.copyChildren(arg, mrow);
    NodeUtil_js_1.default.copyAttributes(arg, mrow);
    return mrow;
};
exports.GetArgumentMML = GetArgumentMML;
const ArialabelMethods = {};
/**
 * Implements \arialabel{name}{math}
 * @param {TexParser} parser The calling parser.
 * @param {string} name The TeX string
 */
ArialabelMethods.Arialabel = function (parser, name) {
    if (typeof name === "string") {
        const thelabel = parser.GetArgument(name);
        const arg = (0, exports.GetArgumentMML)(parser, name);
        NodeUtil_js_1.default.setAttribute(arg, "arialabel", thelabel);
        parser.Push(arg);
    }
};
//# sourceMappingURL=aria-label.js.map

/***/ },

/***/ 463
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseComplexNumber = parseComplexNumber;
exports.processComplexNumber = processComplexNumber;
exports.processComplexQuantity = processComplexQuantity;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const numMethods_1 = __webpack_require__(703);
const options_1 = __webpack_require__(878);
const numPostProcessMethods_1 = __webpack_require__(258);
const numDisplayMethods_1 = __webpack_require__(85);
const unitMethods_1 = __webpack_require__(249);
const qtyMethods_1 = __webpack_require__(471);
const ComplexDefault = {
    real: Object.assign({}, numMethods_1.NumberPieceDefault),
    imaginary: Object.assign({}, numMethods_1.NumberPieceDefault),
    inputMode: 'cartesian'
};
function parseComplexNumber(parser, text, options) {
    const complex = Object.assign({}, ComplexDefault);
    // Check if polar input
    if (text.includes(':')) {
        complex.inputMode = 'polar';
        // parse polar
        const regex = /(.+):(.+)/;
        const matches = text.match(regex);
        if (matches) {
            complex.real = (0, numMethods_1.parseNumber)(parser, matches[1], options);
            complex.imaginary = (0, numMethods_1.parseNumber)(parser, matches[2], options);
        }
    }
    else {
        // parse cartesian
        // check if imaginary part exists
        const imaginaryTokenRegex = new RegExp(`[${options["input-complex-root"]}]`);
        if (text.match(imaginaryTokenRegex)) {
            // identify splitter and split parts
            const regexSplit = /[+-](?![^+-]*[+-])/;
            const sign = text.match(regexSplit);
            const split = text.split(regexSplit);
            if (split.length > 1) {
                complex.real = (0, numMethods_1.parseNumber)(parser, split[0].trim(), options);
                //remove imaginary token, add sign, and parse
                let value = split[1].replace(imaginaryTokenRegex, '').trim();
                if (!value) {
                    value = '1';
                }
                complex.imaginary = (0, numMethods_1.parseNumber)(parser, sign + value, options);
            }
            else {
                // here because positive imaginary only number was used... i.e. 2i
                let value = split[0].replace(imaginaryTokenRegex, '');
                if (!value) {
                    value = '1';
                }
                complex.imaginary = (0, numMethods_1.parseNumber)(parser, value, options);
            }
        }
        else {
            // edge case: only real
            complex.real = (0, numMethods_1.parseNumber)(parser, text, options);
        }
    }
    return complex;
}
function cartesianToPolar(parser, complex, options, useDegrees = true) {
    const x = (0, numMethods_1.pieceToNumber)(complex.real);
    const y = (0, numMethods_1.pieceToNumber)(complex.imaginary);
    const r = Math.hypot(x, y);
    let ang = Math.atan2(y, x);
    if (useDegrees) {
        ang = ang / 2 / Math.PI * 360;
    }
    complex.real = (0, numMethods_1.parseNumber)(parser, r.toString(), options);
    complex.imaginary = (0, numMethods_1.parseNumber)(parser, ang.toString(), options);
}
function polarToCartesian(parser, complex, options, inputDegrees = true) {
    const r = (0, numMethods_1.pieceToNumber)(complex.real);
    let ang = (0, numMethods_1.pieceToNumber)(complex.imaginary);
    if (inputDegrees) {
        ang = ang * 2 * Math.PI / 360;
    }
    const x = r * Math.cos(ang);
    const y = r * Math.sin(ang);
    complex.real = (0, numMethods_1.parseNumber)(parser, x.toString(), options);
    complex.imaginary = (0, numMethods_1.parseNumber)(parser, y.toString(), options);
}
function displayComplexNumber(complex, parser, options) {
    const realMmlNode = (0, numDisplayMethods_1.displayOutputMml)(complex.real, parser, options);
    const root = parser.create('node', 'inferredMrow', [], {});
    root.appendChild(realMmlNode);
    const complexValue = (0, numMethods_1.pieceToNumber)(complex.imaginary);
    if (complexValue !== 0) {
        if (complex.inputMode === 'polar' && options["complex-mode"] === 'input' || options["complex-mode"] === 'polar') {
            const angle = (new TexParser_js_1.default(options["complex-symbol-angle"], parser.stack.env, parser.configuration)).mml();
            root.appendChild(angle);
            const complexMmlNode = (0, numDisplayMethods_1.displayOutputMml)(complex.imaginary, parser, options);
            root.appendChild(complexMmlNode);
            if (options["complex-angle-unit"] === 'degrees') {
                const degree = (new TexParser_js_1.default(options["complex-symbol-degree"], parser.stack.env, parser.configuration)).mml();
                root.appendChild(degree);
            }
        }
        else {
            // extract sign from imaginary part
            const sign = complex.imaginary.sign === '-' ? '-' : '+';
            complex.imaginary.sign = '';
            if ((0, numMethods_1.pieceToNumber)(complex.real) !== 0 || sign === '-') {
                const signNode = (new TexParser_js_1.default(sign, parser.stack.env, parser.configuration)).mml();
                root.appendChild(signNode);
            }
            if (options["complex-root-position"] === 'before-number') {
                const rootNode = (new TexParser_js_1.default(options["output-complex-root"], parser.stack.env, parser.configuration)).mml();
                root.appendChild(rootNode);
            }
            if (complexValue !== 1 || options["print-complex-unity"]) {
                const complexMmlNode = (0, numDisplayMethods_1.displayOutputMml)(complex.imaginary, parser, options);
                root.appendChild(complexMmlNode);
            }
            if (options["complex-root-position"] === 'after-number') {
                const rootNode = (new TexParser_js_1.default(options["output-complex-root"], parser.stack.env, parser.configuration)).mml();
                root.appendChild(rootNode);
            }
        }
    }
    return root;
}
function processComplexNumber(parser) {
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    const text = parser.GetArgument('complexnum');
    if (globalOptions["parse-numbers"]) {
        const complex = parseComplexNumber(parser, text, globalOptions);
        if (globalOptions["complex-mode"] === 'polar' && complex.inputMode !== 'polar') {
            cartesianToPolar(parser, complex, globalOptions, globalOptions["complex-angle-unit"] === 'degrees');
        }
        else if (globalOptions["complex-mode"] === 'cartesian' && complex.inputMode !== 'cartesian') {
            polarToCartesian(parser, complex, globalOptions, globalOptions["complex-angle-unit"] === 'degrees');
        }
        (0, numPostProcessMethods_1.postProcessNumber)(parser, complex.real, globalOptions);
        (0, numPostProcessMethods_1.postProcessNumber)(parser, complex.imaginary, globalOptions);
        return displayComplexNumber(complex, parser, globalOptions);
    }
    else {
        const mml = (new TexParser_js_1.default(text, parser.stack.env, parser.configuration)).mml();
        return mml;
    }
}
function processComplexQuantity(parser) {
    var _a, _b;
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    const complexnum = parser.GetArgument('complexnum');
    const unitString = parser.GetArgument('unit');
    let unitDisplay = '';
    const isLiteral = (unitString.indexOf('\\') === -1);
    const unitPieces = (0, unitMethods_1.parseUnit)(parser, unitString, globalOptions, localOptions, isLiteral);
    const complex = parseComplexNumber(parser, complexnum, globalOptions);
    if (globalOptions["complex-mode"] === 'polar' && complex.inputMode !== 'polar') {
        cartesianToPolar(parser, complex, globalOptions);
    }
    else if (globalOptions["complex-mode"] === 'cartesian' && complex.inputMode !== 'cartesian') {
        polarToCartesian(parser, complex, globalOptions);
    }
    // convert number and unit if necessary
    (_a = qtyMethods_1.prefixModeMap.get(globalOptions["prefix-mode"])) === null || _a === void 0 ? void 0 : _a(parser, complex.real, unitPieces, globalOptions);
    (_b = qtyMethods_1.prefixModeMap.get(globalOptions["prefix-mode"])) === null || _b === void 0 ? void 0 : _b(parser, complex.imaginary, unitPieces, globalOptions);
    (0, numPostProcessMethods_1.postProcessNumber)(parser, complex.real, globalOptions);
    (0, numPostProcessMethods_1.postProcessNumber)(parser, complex.imaginary, globalOptions);
    const complexNumMml = displayComplexNumber(complex, parser, globalOptions);
    parser.Push(complexNumMml);
    //let quantityProductNode: MmlNode|undefined = undefined;
    const trimmedQuantityProduct = globalOptions["quantity-product"].trimStart();
    if (trimmedQuantityProduct) {
        const spacerNode = (new TexParser_js_1.default(trimmedQuantityProduct, parser.stack.env, parser.configuration)).mml();
        const spacerUnicode = (0, numDisplayMethods_1.findInnerText)(spacerNode);
        let quantityProductNode = parser.create('token', 'mo', {}, spacerUnicode);
        parser.Push(quantityProductNode);
    }
    // Need to process this after number because some options alter unit prefixes
    unitDisplay = (0, unitMethods_1.displayUnits)(parser, unitPieces, globalOptions, isLiteral);
    const unitNode = (new TexParser_js_1.default(unitDisplay, parser.stack.env, parser.configuration)).mml();
    parser.Push(unitNode);
}
//# sourceMappingURL=complexMethods.js.map

/***/ },

/***/ 705
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.siunitxError = void 0;
const TexError_js_1 = __importDefault(__webpack_require__(446));
const resource_en_json_1 = __importDefault(__webpack_require__(74));
class siunitxError {
}
exports.siunitxError = siunitxError;
siunitxError.BadOptionChars = (option) => new TexError_js_1.default('siunitx:badOptionChars', resource_en_json_1.default.badOptionsChars, option);
siunitxError.ComparatorAlreadySet = (existing, toBeAdded) => new TexError_js_1.default('siunitx:comparatorAlreadySet', resource_en_json_1.default.comparatorAlreadySet, existing, toBeAdded);
siunitxError.ExponentThresholdsError = (option) => new TexError_js_1.default('sinunitx:exponentThresholdsError', resource_en_json_1.default.exponentThresholdsError, option);
siunitxError.ExtraSemicolon = () => new TexError_js_1.default('siunitx:extraSemicolon', resource_en_json_1.default.extraSemicolon);
siunitxError.InvalidAngArgument = (arg) => new TexError_js_1.default('siunitx:invalidAngArgument', resource_en_json_1.default.invalidAngArgument, arg);
siunitxError.InvalidNumArgument = (arg) => new TexError_js_1.default('siunitx:invalidNumArgument', resource_en_json_1.default.invalidNumArgument, arg);
siunitxError.InvalidOptionValue = (key, type) => new TexError_js_1.default('siunitx:invalidOptionValue', resource_en_json_1.default.invalidOptionValue, key, type);
siunitxError.InvalidOptionName = (name) => new TexError_js_1.default('siunitx:invalidOptionName', resource_en_json_1.default.invalidOptionName, name);
siunitxError.LiteralUnitsForbidden = (macro) => new TexError_js_1.default('siunitx:literalUnitsForbidden', resource_en_json_1.default.literalUnitsForbidden, macro);
siunitxError.NoInterpretationForUnitMacro = (macro) => new TexError_js_1.default('siunitx:macroNotDefined', resource_en_json_1.default.macroNotDefined, macro);
siunitxError.NoUncertaintyToClose = () => new TexError_js_1.default('siunitx:noUncertaintyToClose', resource_en_json_1.default.noUncertaintyToClose);
siunitxError.UncertaintyAlreadyClosed = () => new TexError_js_1.default('siunitx:uncertaintyAlreadyClosed', resource_en_json_1.default.uncertaintyAlreadyClosed);
siunitxError.DenominatorParsingError = (denominator, permode) => new TexError_js_1.default('siunitx:denominatorParsingError', resource_en_json_1.default.denominatorParsingError, denominator, permode);
//# sourceMappingURL=errors.js.map

/***/ },

/***/ 85
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.findInnerText = findInnerText;
exports.convertUncertaintyToBracket = convertUncertaintyToBracket;
exports.createExponentMml = createExponentMml;
exports.displayNumberMml = displayNumberMml;
exports.displayOutputMml = displayOutputMml;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const spaceMap = {
    '1em': '\u2001',
    '2em': '\u2001\u2001',
    '0.167em': '\u2006',
    '0.222em': '\u2005', // U+2005 is actually .25em
    '0.278em': '\u2004', // U+2004 is actually .333em
    // include no leading zero versions just in case...
    '.167em': '\u2006',
    '.222em': '\u2005', // U+2005 is actually .25em
    '.278em': '\u2004', // U+2004 is actually .333em
    //U+2009 is font dependent, so not reliable
};
function findInnerText(node) {
    const data = { text: '' };
    node.walkTree((node, data) => {
        if (!node.isToken)
            return;
        if (node.isKind('mspace')) {
            const w = node.attributes.getExplicit('width');
            if (Object.prototype.hasOwnProperty.call(spaceMap, w)) {
                data.text += spaceMap[w];
            }
        }
        else {
            data.text += node.getText();
        }
    }, data);
    return data.text;
}
function addSpacing(parser, text, digitGroupSize, minimum, spacer, reverse, digitGroupFirstSize, digitGroupOtherSize) {
    // parse the latex space, extract the em spacing, and lookup the proper unicode space
    const spacerNode = (new TexParser_js_1.default(spacer, parser.stack.env, parser.configuration)).mml();
    const mmlSpacer = findInnerText(spacerNode);
    // do not use text.split('') as that won't work with 32-bit unicode characters.
    const digits = [...text];
    if (digits.length >= minimum) {
        const firstSize = (digitGroupFirstSize !== -1 ? digitGroupFirstSize : digitGroupSize);
        const groupSize = (digitGroupOtherSize !== -1 ? digitGroupOtherSize : digitGroupSize);
        const [start, size] = (reverse ? [firstSize, groupSize + 1] : [digits.length - firstSize, -groupSize]);
        for (let i = start; i >= 0 && i < digits.length; i += size) {
            digits.splice(i, 0, mmlSpacer);
        }
    }
    return digits.join('');
}
const groupNumbersMap = new Map([
    ['all', (parser, num, options) => {
            num.whole = addSpacing(parser, num.whole, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], false, options["digit-group-first-size"], options["digit-group-other-size"]);
            num.fractional = addSpacing(parser, num.fractional, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], true, options["digit-group-first-size"], options["digit-group-other-size"]);
        }],
    ['decimal', (parser, num, options) => {
            num.fractional = addSpacing(parser, num.fractional, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], true, options["digit-group-first-size"], options["digit-group-other-size"]);
        }],
    ['integer', (parser, num, options) => {
            num.whole = addSpacing(parser, num.whole, options["digit-group-size"], options["group-minimum-digits"], options["group-separator"], false, options["digit-group-first-size"], options["digit-group-other-size"]);
        }],
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    ['none', () => { }]
]);
function convertUncertaintyToPlusMinus(uncertainty, piece, options) {
    if (uncertainty.type !== 'pm') {
        // if there's a decimal in the uncertainty, then it's ok to display as-is
        if (!uncertainty.decimal) {
            // add zeros, move whole to fraction part, and potentially add decimal and whole
            const diff = piece.fractional.length - uncertainty.whole.length;
            if (diff >= 0) {
                //move whole value uncertainty to fractional part and pad left with zeros if needed
                // i.e. 12.455(4) ==> 12.455 +- 0.004  (diff = 2)
                for (let i = 0; i < diff; i++) {
                    uncertainty.fractional += "0";
                }
                uncertainty.fractional += uncertainty.whole;
                uncertainty.whole = '0';
                uncertainty.decimal = options["output-decimal-marker"];
            }
            else {
                // uncertainty is bigger than fraction.  Need to split uncertainty to whole and fractional.
                // i.e. 123.4(12) ==> 123.4 +- 1.2  (diff = -1)
                // i.e. 123.4(144) ==> 123.4 +- 14.4 (diff = -2)
                // i.e. 123.45(144) ==> 123.45 +- 1.44 (diff = -1)
                uncertainty.fractional = uncertainty.whole.slice(Math.abs(diff));
                uncertainty.decimal = options["output-decimal-marker"];
                uncertainty.whole = uncertainty.whole.slice(0, Math.abs(diff));
            }
        }
    }
}
function convertUncertaintyToBracket(uncertainty, piece, options) {
    if (uncertainty.type === 'bracket') {
        // check to make sure that uncertainty doesn't need a decimal point via 'compact marker' or 'full' (full adds zeros to fractional only uncertainty!)
        // should only be checked if there is NOT already a decimal point
        if (!uncertainty.decimal && (options["uncertainty-mode"] === 'compact-marker' || options["uncertainty-mode"] === 'full')) {
            const diff = uncertainty.whole.length - piece.fractional.length;
            if (diff > 0) {
                uncertainty.fractional = uncertainty.whole.slice(diff, uncertainty.whole.length);
                uncertainty.whole = uncertainty.whole.slice(0, diff);
                if (uncertainty.fractional) {
                    uncertainty.decimal = options["output-decimal-marker"];
                }
            }
            else if (diff < 0 && options["uncertainty-mode"] === 'full') {
                uncertainty.fractional = ''.padEnd(Math.abs(diff), '0') + uncertainty.whole;
                uncertainty.whole = '0';
                uncertainty.decimal = options["output-decimal-marker"];
            }
        }
    }
    else {
        //easiest way is to convert to a number and check if less than zero
        const strNum = uncertainty.whole + uncertainty.decimal + uncertainty.fractional;
        const num = +(strNum);
        // if less than 1 (just a fraction), then remove leading zeros.  Else leave it as is.
        if (num < 1) {
            let position = 0;
            for (let i = 0; i < uncertainty.fractional.length; i++) {
                if (uncertainty.fractional[i] !== '0') {
                    break;
                }
                position++;
            }
            uncertainty.whole = uncertainty.fractional.slice(position, uncertainty.fractional.length);
            uncertainty.decimal = '';
            uncertainty.fractional = '';
        }
    }
}
function displayUncertaintyBracketMml(uncertainty, parser, options) {
    const uncertaintySeparator = (new TexParser_js_1.default(options["uncertainty-separator"], parser.stack.env, parser.configuration)).mml();
    const openUncertainty = (new TexParser_js_1.default(options["output-open-uncertainty"], parser.stack.env, parser.configuration)).mml();
    let number = uncertainty.whole;
    number += (options["uncertainty-mode"] === 'compact-marker' || options["uncertainty-mode"] === 'full') && uncertainty.decimal ? options["output-decimal-marker"] : '';
    number += uncertainty.fractional;
    const numberNode = parser.create('token', 'mn', {}, number);
    const closeUncertainty = (new TexParser_js_1.default(options["output-close-uncertainty"], parser.stack.env, parser.configuration)).mml();
    const mrow = parser.create('node', 'inferredMrow', [uncertaintySeparator, openUncertainty, numberNode, closeUncertainty]);
    return mrow;
}
function displayUncertaintyPlusMinusMml(uncertainty, parser, options) {
    const numberNode = displayNumberMml(uncertainty, parser, options);
    const plusMinusNode = parser.create('token', 'mo', {}, '\u00b1'); // plus-minus sign 
    const mrow = parser.create('node', 'inferredMrow', [plusMinusNode, numberNode], { 'data-siunitx-uncertainty': true });
    return mrow;
}
const uncertaintyModeMmlMapping = new Map([
    ['separate', (uncertainty, value, parser, options) => {
            convertUncertaintyToPlusMinus(uncertainty, value, options);
            return displayUncertaintyPlusMinusMml(uncertainty, parser, options);
        }],
    ['compact', (uncertainty, value, parser, options) => {
            convertUncertaintyToBracket(uncertainty, value, options);
            return displayUncertaintyBracketMml(uncertainty, parser, options);
        }],
    ['full', (uncertainty, value, parser, options) => {
            convertUncertaintyToBracket(uncertainty, value, options);
            return displayUncertaintyBracketMml(uncertainty, parser, options);
        }],
    ['compact-marker', (uncertainty, value, parser, options) => {
            convertUncertaintyToBracket(uncertainty, value, options);
            return displayUncertaintyBracketMml(uncertainty, parser, options);
        }],
]);
function createExponentMml(num, parser, options) {
    const root = parser.create('node', 'inferredMrow', [], {});
    const exponentProductNode = (new TexParser_js_1.default(options["exponent-product"], parser.stack.env, parser.configuration)).mml();
    const exponentBaseNode = (new TexParser_js_1.default(options["exponent-base"], parser.stack.env, parser.configuration)).mml();
    if (options["print-zero-exponent"] && (!num.exponent || (num.exponent === '0'))) {
        const zeroNode = parser.create('token', 'mn', {}, '0');
        if (options["output-exponent-marker"] !== '') {
            const customExponentMarker = parser.create('token', 'mi', { mathvariant: 'normal' }, options["output-exponent-marker"]);
            root.appendChild(customExponentMarker);
            root.appendChild(zeroNode);
        }
        else {
            if (options["tight-spacing"]) {
                exponentProductNode.attributes.set('lspace', '0em');
                exponentProductNode.attributes.set('rspace', '0em');
            }
            const exponential = parser.create('node', 'msup', [exponentBaseNode, zeroNode]);
            // Edge case \num[print-unity-mantissa = false, print-zero-exponent = true]{1e0}  
            // as this should resolve to 10^0 without mantissa and exponent marker
            if (options["print-unity-mantissa"]) {
                root.appendChild(exponentProductNode);
            }
            root.appendChild(exponential);
        }
    }
    else if (num.exponent && num.exponent !== '0') {
        const exponentSignNode = parser.create('token', 'mo', {}, num.exponentSign);
        const exponentValueNode = parser.create('token', 'mn', {}, num.exponent);
        const supPart = num.exponentSign === '-'
            ? parser.create('node', 'mrow', [exponentSignNode, exponentValueNode])
            : exponentValueNode;
        const exponential = parser.create('node', 'msup', [exponentBaseNode, supPart]);
        // if unity mantissa AND don't print it, then can't print exponentMarkers (E) nor exponentProduct (\\times)
        if (num.whole === '1' && num.fractional === '' && !options["print-unity-mantissa"]) {
            root.appendChild(exponential);
        }
        else {
            if (num.exponentMarker) {
                if (options["output-exponent-marker"] !== '') {
                    const customExponentMarker = (new TexParser_js_1.default(options["output-exponent-marker"], parser.stack.env, parser.configuration)).mml();
                    root.appendChild(customExponentMarker);
                    root.appendChild(supPart);
                }
                else {
                    if (num.whole || num.fractional) {
                        if (options["tight-spacing"]) {
                            exponentProductNode.attributes.set('lspace', '0em');
                            exponentProductNode.attributes.set('rspace', '0em');
                        }
                        root.appendChild(exponentProductNode);
                    }
                    root.appendChild(exponential);
                }
            }
        }
    }
    return root;
}
function displayNumberMml(num, parser, options) {
    var _a, _b;
    const rootNode = parser.create('node', 'mrow');
    if (num.sign === '-' && options["negative-color"]) {
        rootNode.attributes.set('mathcolor', options["negative-color"]);
    }
    (_a = groupNumbersMap.get(options["group-digits"])) === null || _a === void 0 ? void 0 : _a(parser, num, options);
    if (options["bracket-negative-numbers"]) {
        if (num.sign === '-') {
            const leftBracket = parser.create('token', 'mo', { stretchy: false }, '(');
            rootNode.appendChild(leftBracket);
        }
    }
    if (num.sign || options["print-implicit-plus"]) {
        const sign = parser.create('token', 'mo', { rspace: "0em", lspace: "0em" }, num.sign || '+');
        rootNode.appendChild(sign);
    }
    let numberString = '';
    let trailingMml = undefined;
    // if unity mantissa AND don't print it, then we don't need the rest of this.
    if (num.whole === '1' && !num.fractional && !options["print-unity-mantissa"]) {
        // don't do anything UNLESS exponent is also zero and printZeroExponent is false
        if (!options["print-zero-exponent"] && (!num.exponent || (num.exponent === '0' && num.exponentSign !== '-'))) {
            numberString = '1';
        }
    }
    else {
        if ((!num.whole && num.fractional) || +(num.whole) === 0) {
            if (options["print-zero-integer"]) {
                numberString = '0';
            }
        }
        else {
            numberString = num.whole;
        }
        numberString += (num.decimal ? options["output-decimal-marker"] : '');
        if (options["zero-decimal-as-symbol"] && +(num.fractional) === 0) {
            trailingMml = (new TexParser_js_1.default(options["zero-symbol"], parser.stack.env, parser.configuration)).mml();
        }
        else {
            numberString += num.fractional;
        }
    }
    const numberNode = parser.create('token', 'mn', {}, numberString);
    rootNode.appendChild(numberNode);
    if (trailingMml) {
        rootNode.appendChild(trailingMml);
    }
    // display uncertanties (if not null)
    (_b = num.uncertainty) === null || _b === void 0 ? void 0 : _b.forEach(v => {
        var _a;
        const uncertaintyNode = (_a = uncertaintyModeMmlMapping.get(options["uncertainty-mode"])) === null || _a === void 0 ? void 0 : _a(v, num, parser, options);
        rootNode.appendChild(uncertaintyNode || parser.create('node', 'inferredMrow'));
    });
    const exponentNode = createExponentMml(num, parser, options);
    rootNode.appendChild(exponentNode);
    if (options["bracket-negative-numbers"] && num.sign === '-') {
        const rightBracket = parser.create('token', 'mo', { stretchy: false }, ')');
        rootNode.appendChild(rightBracket);
    }
    return rootNode;
}
function displayOutputMml(num, parser, options) {
    const color = options["number-color"] || options.color;
    const rootNode = parser.create('node', color ? 'mrow' : 'inferredMrow', [], color ? { mathcolor: color } : {});
    if (num.prefix) {
        const prefix = (new TexParser_js_1.default('{' + num.prefix + '}', parser.stack.env, parser.configuration)).mml();
        rootNode.appendChild(prefix);
    }
    rootNode.appendChild(displayNumberMml(num, parser, options));
    return rootNode;
}
//# sourceMappingURL=numDisplayMethods.js.map

/***/ },

/***/ 703
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NumberPieceDefault = void 0;
exports.generateNumberPiece = generateNumberPiece;
exports.pieceToNumber = pieceToNumber;
exports.generateNumberMapping = generateNumberMapping;
exports.parseNumber = parseNumber;
exports.processNumber = processNumber;
const TexError_js_1 = __importDefault(__webpack_require__(446));
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const numDisplayMethods_1 = __webpack_require__(85);
const numPostProcessMethods_1 = __webpack_require__(258);
const options_1 = __webpack_require__(878);
const errors_1 = __webpack_require__(705);
exports.NumberPieceDefault = {
    prefix: '',
    sign: '',
    whole: '',
    decimal: '',
    fractional: '',
    exponentMarker: '',
    exponentSign: '',
    exponent: '',
    uncertainty: [] // this is temporary
};
const UncertaintyDefault = Object.assign(Object.assign({}, exports.NumberPieceDefault), { type: 'pm', completed: false });
// Can't splat default otherwise array reference gets copied.  Need to construct it freshly.
function generateNumberPiece() {
    const piece = Object.assign({}, exports.NumberPieceDefault);
    piece.uncertainty = new Array();
    return piece;
}
function pieceToNumber(piece) {
    let build = piece.sign + piece.whole;
    if (piece.fractional) {
        build += '.' + piece.fractional;
    }
    if (piece.exponent) {
        build += 'e' + piece.exponentSign + piece.exponent;
    }
    try {
        let result = Number.parseFloat(build);
        if (Number.isNaN(result)) {
            result = 0;
        }
        return result;
    }
    catch (_a) {
        return 0;
    }
}
// INumberPiece is built from left to right, so we're always working on the latest part... which could be uncertainty.  So get the last piece.
// If uncertainty is completed, then return the number.  Could be an uncertainty before the exponent.  
function getLastNumPiece(numPiece) {
    if (numPiece.uncertainty.length > 0 && !numPiece.uncertainty[numPiece.uncertainty.length - 1].completed) {
        return numPiece.uncertainty[numPiece.uncertainty.length - 1];
    }
    else {
        return numPiece;
    }
}
function parseDigits(text, numPiece) {
    const num = getLastNumPiece(numPiece);
    if (num.exponentMarker) {
        num.exponent += text;
    }
    else if (num.decimal) {
        num.fractional += text;
    }
    else {
        num.whole += text;
    }
}
function parseDecimals(text, numPiece) {
    const num = getLastNumPiece(numPiece);
    num.decimal += text;
}
function parseComparators(text, numPiece) {
    const num = getLastNumPiece(numPiece);
    if (num.prefix) {
        throw errors_1.siunitxError.ComparatorAlreadySet(num.prefix, text);
    }
    num.prefix += text;
}
function parseExponentMarkers(text, numPiece) {
    //let numPiece: INumberPiece;
    // if (numPiece.uncertainty.length > 0){
    // 	num = numPiece.uncertainty[numPiece.uncertainty.length-1];
    // } else {
    // 	num = numPiece;
    // }
    numPiece.exponentMarker += text;
}
function parseSigns(text, numPiece) {
    const num = getLastNumPiece(numPiece);
    if (num.exponentMarker) {
        num.exponentSign += text;
    }
    else {
        num.sign += text;
    }
}
function parseOpenUncertainty(text, numPiece) {
    const uncertainty = Object.assign(Object.assign({}, UncertaintyDefault), { type: 'bracket' });
    numPiece.uncertainty.push(uncertainty);
}
function parseCloseUncertainty(text, numPiece) {
    if (numPiece.uncertainty.length === 0) {
        throw new TexError_js_1.default('50', 'Trying to close an uncertainty that doesn\'t exist.');
    }
    const uncertainty = numPiece.uncertainty[numPiece.uncertainty.length - 1];
    if (uncertainty.completed) {
        throw new TexError_js_1.default('51', 'Uncertainty was already closed.');
    }
    uncertainty.completed = true;
}
function parseUncertaintySigns(text, numPiece) {
    const uncertainty = Object.assign(Object.assign({}, UncertaintyDefault), { type: 'pm' });
    numPiece.uncertainty.push(uncertainty);
}
function parseIgnore() {
    // do nothing
}
// using two types for output.  Ex.  \\pm is used both as sign and as an uncertainty.  Need map of map for this one.
function generateNumberMapping(options) {
    const parseMap = new Map();
    const matchMacrosOrChar = /\\(?:[a-zA-Z]+|[\uD800-\uDBFF].|.)|[\uD800-\uDBFF].|[^\s\\]/g;
    for (const [key, method] of [
        ['input-comparators', parseComparators],
        ['input-signs', parseSigns],
        ['input-digits', parseDigits],
        ['input-decimal-markers', parseDecimals],
        ['input-open-uncertainty', parseOpenUncertainty],
        ['input-close-uncertainty', parseCloseUncertainty],
        ['input-uncertainty-signs', parseUncertaintySigns],
        ['input-exponent-markers', parseExponentMarkers],
        ['input-ignore', parseIgnore]
    ]) {
        const option = options[key];
        if (option.match(/(?:^|[^\\])(?:\\\\)*\\$/)) {
            throw errors_1.siunitxError.BadOptionChars(key);
        }
        (option.match(matchMacrosOrChar) || []).forEach((c) => {
            if (parseMap.has(c) && key === 'input-uncertainty-signs') {
                const inputSigns = parseMap.get(c);
                const altMethod = function (macro, num) {
                    (num.whole === '' && num.decimal === '' ? inputSigns : parseUncertaintySigns)(macro, num);
                };
                parseMap.set(c, altMethod);
            }
            else {
                parseMap.set(c, method);
            }
        });
    }
    return parseMap;
}
function parseNumber(parser, text, options) {
    const mapping = generateNumberMapping(options);
    text = text.replace('<<', '\\ll')
        .replace('>>', '\\gg')
        .replace('<=', '\\le')
        .replace('>=', '\\ge')
        .replace('+-', '\\pm');
    const num = generateNumberPiece();
    const subParser = new TexParser_js_1.default(text, parser.stack.env, parser.configuration);
    subParser.i = 0;
    // process character
    // if '\', then read until next '\' or whitespace char
    let token;
    while (subParser.i < subParser.string.length) {
        token = subParser.GetNext();
        subParser.i++; // GetNext() does not advance position unless skipping whitespace
        if (token === '\\') {
            token += subParser.GetCS();
        }
        try {
            mapping.get(token)(token, num);
        }
        catch (_a) {
            throw errors_1.siunitxError.InvalidNumArgument(subParser.string);
        }
    }
    if (!options["retain-explicit-decimal-marker"] && num.decimal && !num.fractional) {
        num.decimal = '';
    }
    if (!options["retain-explicit-plus"] && num.sign === '+') {
        num.sign = '';
    }
    // adding exponent to value check here.  Without it, exponentials without a base won't stay negative. (-e10)
    const value = +(num.whole + (num.decimal ? '.' : '') + num.fractional + (num.exponent === '' ? '' : 'e' + num.exponentSign + num.exponent));
    if (value === 0 && !options["retain-negative-zero"] && num.sign === '-') {
        num.sign = '';
    }
    if (!options["retain-zero-uncertainty"]) {
        for (let i = num.uncertainty.length - 1; i >= 0; i--) {
            const uncertaintyValue = +(num.uncertainty[i].whole + (num.uncertainty[i].decimal ? '.' : '') + num.uncertainty[i].fractional);
            if (uncertaintyValue === 0) {
                num.uncertainty.splice(i, 1);
            }
        }
    }
    return num;
}
function processNumber(parser) {
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    let text = parser.GetArgument('num');
    if (globalOptions["parse-numbers"]) {
        // going to assume evaluate expression is processed first, THEN the result is parsed normally
        if (globalOptions["evaluate-expression"]) {
            // TODO Sanitize Evaluate Expression!
            let expression = globalOptions.expression;
            expression = expression.replace('#1', text);
            text = eval(expression).toString();
        }
        const num = parseNumber(parser, text, globalOptions);
        (0, numPostProcessMethods_1.postProcessNumber)(parser, num, globalOptions);
        //const displayResult = displayOutput(num, globalOptions);
        const mmlNode = (0, numDisplayMethods_1.displayOutputMml)(num, parser, globalOptions);
        //const mml = (new TexParser(displayResult, parser.stack.env, parser.configuration)).mml();
        return mmlNode;
    }
    else {
        const mml = (new TexParser_js_1.default(text, parser.stack.env, parser.configuration)).mml();
        return mml;
    }
}
//# sourceMappingURL=numMethods.js.map

/***/ },

/***/ 258
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.convertToFixed = convertToFixed;
exports.postProcessNumber = postProcessNumber;
const errors_1 = __webpack_require__(705);
const numMethods_1 = __webpack_require__(703);
function convertToScientific(parser, numOriginal, options) {
    //convert to actual number and use formating to print scientific
    const num = JSON.parse(JSON.stringify(numOriginal));
    const val = (+(num.sign + num.whole + num.decimal + num.fractional + (num.exponent ? ('e' + num.exponentSign + num.exponent) : ''))).toExponential();
    // parse that back in
    const newNum = (0, numMethods_1.parseNumber)(parser, val, options);
    //don't forget to check for trailing zeros and put them back
    let trailingZeros = 0;
    // count trailing zeros in original fractional part
    if (num.fractional) {
        for (let i = num.fractional.length - 1; i >= 0; i--) {
            if (num.fractional[i] === '0') {
                trailingZeros++;
            }
            else {
                break;
            }
        }
    }
    // count trailing zeros in original whole part (if all of fractional part was zeros)
    if (num.whole && num.fractional.length === trailingZeros) {
        for (let i = num.whole.length - 1; i >= 0; i--) {
            if (num.whole[i] === '0') {
                trailingZeros++;
            }
            else {
                break;
            }
        }
    }
    // add the appropriate number of trailing zeros.
    for (let i = 0; i < trailingZeros; i++) {
        newNum.fractional += '0';
    }
    // add a decimal if the original didn't have one, but we need it.
    if (!newNum.decimal && trailingZeros > 0) {
        newNum.decimal = '.';
    }
    // copy the new values to the original reference
    for (const prop in num) {
        num[prop] = newNum[prop];
    }
    return num;
}
function convertToExponent(num, targetExponent) {
    if (!num)
        return;
    // count difference between target exponent and current one.
    const diff = targetExponent - +(num.exponentSign + num.exponent);
    const dir = Math.sign(diff); // -: move numbers from frac to whole, +: move the other way
    for (let i = 0; i < Math.abs(diff); i++) {
        if (dir < 0) {
            if (num.fractional.length > 0) {
                num.whole = num.whole + num.fractional.slice(0, 1);
                num.fractional = num.fractional.slice(1, num.fractional.length);
            }
            else {
                num.whole = num.whole + '0';
            }
        }
        else {
            if (num.whole.length > 0) {
                num.fractional = num.whole.slice(num.whole.length - 1, num.whole.length) + num.fractional;
                num.whole = num.whole.slice(0, num.whole.length - 1);
            }
            else {
                num.fractional = '0' + num.fractional;
            }
        }
    }
    if (num.fractional !== '' && num.decimal === '') {
        num.decimal = '.';
    }
    num.exponent = Math.abs(targetExponent).toString();
    num.exponentSign = Math.sign(targetExponent) < 0 ? '-' : '';
}
function convertToEngineering(parser, num, options) {
    // similar to convertToFixed except we calculate the exponent to be a power of three that keeps the whole number part non-zero.
    // convert to scientific, then move decimal...
    const convertedNum = convertToScientific(parser, num, options);
    Object.assign(num, convertedNum);
    let targetExponent = +(num.exponentSign + num.exponent);
    while (targetExponent % 3 !== 0) {
        targetExponent--;
    }
    convertToExponent(num, targetExponent);
}
function convertToFixed(parser, num, options) {
    // convert to scientific, then move decimal...
    const convertedNum = convertToScientific(parser, num, options);
    Object.assign(num, convertedNum);
    convertToExponent(num, options["fixed-exponent"]);
}
const exponentModeMap = new Map([
    ['input', (parser, num, options) => { }], // leave number as-is
    ['fixed', convertToFixed],
    ['engineering', convertToEngineering],
    ['scientific', (parser, num, options) => {
            const convertedNum = convertToScientific(parser, num, options);
            Object.assign(num, convertedNum);
        }],
    ['threshold', (parser, num, options) => {
            const minMax = options["exponent-thresholds"].split(':');
            if (minMax.length !== 2) {
                throw errors_1.siunitxError.ExponentThresholdsError(options["exponent-thresholds"]);
            }
            // ensure we have a version in scientific form but leave the original alone.
            const testNum = convertToScientific(parser, num, options);
            const testExponent = +(testNum.exponentSign + testNum.exponent);
            if (testExponent > +minMax[0] && testExponent < +minMax[1]) {
                //leave number as-is'
            }
            else {
                // copy the scientific form over to the original INumPiece
                Object.assign(num, testNum);
            }
        }]
]);
function shouldRoundUp(toRound, firstDrop, roundEven) {
    let result = false;
    if (firstDrop > 5) {
        result = true;
    }
    else if (firstDrop === 5) {
        if (roundEven) {
            if (toRound % 2 === 0) {
                result = false;
            }
            else {
                result = true;
            }
        }
        else {
            result = true;
        }
    }
    return result;
}
function roundUp(fullNumber, position) {
    let result = '';
    const reverseNumArr = new Array();
    let digit = +fullNumber[position] + 1;
    let roundedNine = digit === 0 ? true : false;
    reverseNumArr.push(digit);
    for (let i = position - 1; i >= 0; i--) {
        if (roundedNine) {
            digit = +fullNumber[i] + 1;
            roundedNine = digit === 0 ? true : false;
            reverseNumArr.push(digit);
        }
        else {
            digit = +fullNumber[i];
            reverseNumArr.push(digit);
        }
    }
    reverseNumArr.reverse();
    reverseNumArr.forEach(v => result += v);
    return result;
}
function roundPlaces(parser, num, options) {
    // if uncertainty exists, no rounding at all!
    if (num.uncertainty.length === 0) {
        if (num.fractional.length > options["round-precision"]) {
            const firstDrop = +num.fractional.slice(options["round-precision"], options["round-precision"] + 1);
            const toRound = +num.fractional.slice(options["round-precision"] - 1, options["round-precision"]);
            const wholeLength = num.whole === '0' ? 0 : num.whole.length;
            if (shouldRoundUp(toRound, firstDrop, options["round-half"] === 'even')) {
                const result = roundUp((num.whole === '0' ? '' : num.whole) + num.fractional, wholeLength + options["round-precision"] - 1);
                //const wholeLength = num.whole.length;
                num.whole = result.slice(0, wholeLength);
                num.fractional = result.slice(wholeLength, result.length);
            }
            else {
                num.fractional = num.fractional.slice(0, options["round-precision"]);
            }
        }
        else if (num.fractional.length < options["round-precision"] && options["round-pad"]) {
            const toAdd = options["round-precision"] - num.fractional.length;
            for (let i = 0; i < toAdd; i++) {
                num.fractional += '0'; // pad with zeros
            }
            if (!num.decimal) {
                num.decimal = options["output-decimal-marker"];
            }
        }
        else {
            //no rounding needed.
        }
        afterRoundZeroOptions(parser, num, options);
    }
}
function roundFigures(parser, num, options) {
    // if uncertainty exists, no rounding at all!
    if (num.uncertainty.length === 0) {
        // whole can't be '0', and converting fractional to number and back to string gets rid of leading zeros.
        const combined = num.whole === '0' ? (+num.fractional).toString() : num.whole + (+num.fractional).toString();
        if (combined.length > options["round-precision"]) {
            const firstDrop = +combined.slice(options["round-precision"], options["round-precision"] + 1);
            const toRound = +combined.slice(options["round-precision"] - 1, options["round-precision"]);
            let roundingResult;
            // round up or down
            if (shouldRoundUp(toRound, firstDrop, options["round-half"] === 'even')) {
                roundingResult = roundUp(combined, options["round-precision"] - 1);
            }
            else {
                roundingResult = combined.slice(0, options["round-precision"]);
            }
            // split the result back into whole and fractional parts
            const wholeLength = num.whole === '0' ? 0 : num.whole.length;
            if (roundingResult.length >= wholeLength) {
                // need to add leading zeroes to fractional part maybe
                // if whole was zero, check if original fractional had leading zeroes
                if (wholeLength === 0) {
                    num.fractional = ''.padEnd(num.fractional.length - (+num.fractional).toString().length, '0');
                }
                else {
                    num.fractional = '';
                }
                num.fractional += roundingResult.slice(wholeLength, roundingResult.length);
            }
            else {
                num.fractional = '';
                num.decimal = '';
                const addZeros = wholeLength - roundingResult.length;
                num.whole = roundingResult;
                for (let i = 0; i < addZeros; i++) {
                    num.whole += '0'; // This adds zeros to whole numbers when rounding in the mantissa. 
                    // But should we instead convert to scientific and leave the zeros off?
                }
            }
        }
        else if (combined.length < options["round-precision"] && options["round-pad"]) {
            for (let i = 0; i < options["round-precision"] - combined.length; i++) {
                num.fractional += '0'; // pad with zeros, it's only going to go in the fractional part
                if (!num.decimal)
                    num.decimal = '.';
            }
        }
        else {
            //no rounding needed.
        }
        afterRoundZeroOptions(parser, num, options);
    }
}
function roundUncertainty(_parser, num, options) {
    // only round if uncertainty included
    if (num.uncertainty.length > 0) {
        // just in case convert uncertainty to bracket form... easier to round
        num.uncertainty.forEach(uncertainty => {
            if (uncertainty.type === 'pm') {
                //easiest way is to convert to a number and check if less than zero
                const strNum = uncertainty.whole + uncertainty.decimal + uncertainty.fractional;
                const num = +(strNum);
                // if less than 1 (just a fraction), then remove leading zeros.  Else leave it as is.
                if (num < 1) {
                    let position = 0;
                    for (let i = 0; i < uncertainty.fractional.length; i++) {
                        if (uncertainty.fractional[i] !== '0') {
                            break;
                        }
                        position++;
                    }
                    uncertainty.whole = uncertainty.fractional.slice(position, uncertainty.fractional.length);
                    uncertainty.decimal = '';
                    uncertainty.fractional = '';
                }
            }
        });
        // should all uncertainties have same precision? ... no, so round to smallest
        let smallest = 999;
        num.uncertainty.forEach(uncertainty => {
            smallest = Math.min(uncertainty.whole.length, smallest);
            if (uncertainty.whole.length - options["round-precision"] > 0) {
                const firstDrop = +uncertainty.whole.slice(options["round-precision"], options["round-precision"] + 1);
                const toRound = +uncertainty.whole.slice(options["round-precision"] - 1, options["round-precision"]);
                if (shouldRoundUp(toRound, firstDrop, options["round-half"] === 'even')) {
                    uncertainty.whole = roundUp(uncertainty.whole, options["round-precision"] - 1);
                }
                else {
                    uncertainty.whole = uncertainty.whole.slice(0, options["round-precision"]);
                }
            }
        });
        const mainRemove = smallest - options["round-precision"];
        if (mainRemove > 0) {
            const combined = num.whole + num.fractional;
            const precision = combined.length - mainRemove;
            const firstDrop = +combined.slice(precision, precision + 1);
            const toRound = +combined.slice(precision - 1, precision);
            let roundingResult;
            // round up or down
            if (shouldRoundUp(toRound, firstDrop, options["round-half"] === 'even')) {
                roundingResult = roundUp(combined, precision - 1);
            }
            else {
                roundingResult = combined.slice(0, precision);
            }
            // split the result back into whole and fractional parts
            if (roundingResult.length >= num.whole.length) {
                num.fractional = roundingResult.slice(num.whole.length, roundingResult.length);
            }
            else {
                num.fractional = '';
                num.decimal = '';
                const addZeros = num.whole.length - roundingResult.length;
                num.whole = roundingResult;
                for (let i = 0; i < addZeros; i++) {
                    num.whole += '0'; // This adds zeros to whole numbers when rounding in the mantissa. 
                    // But should we instead convert to scientific and leave the zeros off?
                }
            }
        }
        // padding doesn't make sense with uncertainties, skip it.
    }
}
function afterRoundZeroOptions(parser, num, options) {
    // check if zero, then do stuff
    const current = Math.abs(+(num.whole + num.decimal + num.fractional + (num.exponentMarker !== '' ? 'e' : '') + num.exponentSign + num.exponent));
    if (current === 0) {
        if (options["round-minimum"] !== '0') {
            num.prefix = '\\lt';
            const minimumNum = (0, numMethods_1.parseNumber)(parser, options["round-minimum"], options);
            num.sign = minimumNum.sign;
            num.whole = minimumNum.whole;
            num.decimal = minimumNum.decimal;
            num.fractional = minimumNum.fractional;
            num.exponentMarker = minimumNum.exponentMarker;
            num.exponentSign = minimumNum.exponentSign;
            num.exponent = minimumNum.exponent;
        }
        else if (options["round-zero-positive"]) {
            num.sign = '';
        }
    }
}
const roundModeMap = new Map([
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    ['none', () => { }],
    ['places', roundPlaces],
    ['figures', roundFigures],
    ['uncertainty', roundUncertainty]
]);
function postProcessNumber(parser, num, options) {
    // Post-process special case for uncertainty: 123 +- 4.5
    // This number is actually 123.0 +- 4.5 or 123.0(4.5) or 123.0(45)
    // Even if uncertainty is dropped, the original value had a significant zero in the tenths place.
    // Check fraction length of uncertainty[0] and compare to value fraction length.
    // Could theoretically check for equal uncertainty precision in the case of two uncertainties...
    if (num.uncertainty && num.uncertainty.length > 0 && num.uncertainty[0].fractional.length > num.fractional.length) {
        if (!num.decimal) {
            num.decimal = '.';
        }
        num.fractional = num.fractional.padEnd(num.uncertainty[0].fractional.length, '0');
    }
    if (options["drop-uncertainty"]) {
        num.uncertainty.splice(0, num.uncertainty.length);
    }
    if (options["drop-exponent"]) {
        num.exponentMarker = '';
        num.exponentSign = '';
        num.exponent = '';
    }
    roundModeMap.get(options["round-mode"])(parser, num, options);
    if (options["drop-zero-decimal"] && +(num.fractional) === 0) {
        num.fractional = '';
        num.decimal = '';
    }
    if (options["minimum-integer-digits"] > 0) {
        const pad = options["minimum-integer-digits"] - num.whole.length;
        if (pad > 0) {
            for (let i = 0; i < pad; i++) {
                num.whole = '0' + num.whole;
            }
        }
    }
    if (options["minimum-decimal-digits"] > 0) {
        const pad = options["minimum-decimal-digits"] - num.fractional.length;
        if (pad > 0) {
            for (let i = 0; i < pad; i++) {
                num.fractional += '0';
            }
        }
    }
    exponentModeMap.get(options["exponent-mode"])(parser, num, options);
    // remove any explicit plus in exponent
    if (num.exponentSign === '+')
        num.exponentSign = '';
}
//# sourceMappingURL=numPostProcessMethods.js.map

/***/ },

/***/ 771
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.exponentListModeMap = exports.bracketCloseMap = exports.bracketOpenMap = void 0;
exports.parseList = parseList;
exports.processNumberList = processNumberList;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const options_1 = __webpack_require__(878);
const numMethods_1 = __webpack_require__(703);
const numPostProcessMethods_1 = __webpack_require__(258);
const numDisplayMethods_1 = __webpack_require__(85);
exports.bracketOpenMap = new Map([
    ['\\numlist', (options) => options["list-open-bracket"]],
    ['\\numproduct', (options) => options["product-open-bracket"]],
    ['\\numrange', (options) => options["range-open-bracket"]],
    ['\\qtylist', (options) => options["list-open-bracket"]],
    ['\\qtyproduct', (options) => options["product-open-bracket"]],
    ['\\qtyrange', (options) => options["range-open-bracket"]],
]);
exports.bracketCloseMap = new Map([
    ['\\numlist', (options) => options["list-close-bracket"]],
    ['\\numproduct', (options) => options["product-close-bracket"]],
    ['\\numrange', (options) => options["range-close-bracket"]],
    ['\\qtylist', (options) => options["list-close-bracket"]],
    ['\\qtyproduct', (options) => options["product-close-bracket"]],
    ['\\qtyrange', (options) => options["range-close-bracket"]],
]);
exports.exponentListModeMap = new Map([
    ['individual', (nums, _parser, _options) => {
            // do nothing
            return { numbers: nums };
        }],
    ['combine', (nums, parser, options) => {
            const exponentNodes = (0, numDisplayMethods_1.createExponentMml)(nums[0], parser, options);
            nums.forEach(x => {
                x.exponent = '';
                x.exponentMarker = '';
                x.exponentSign = '';
            });
            return { numbers: nums, trailing: exponentNodes };
        }],
    ['combine-bracket', (nums, parser, options) => {
            const exponentNode = (0, numDisplayMethods_1.createExponentMml)(nums[0], parser, options);
            nums.forEach(x => {
                x.exponent = '';
                x.exponentMarker = '';
                x.exponentSign = '';
            });
            const leadingBracket = (new TexParser_js_1.default(exports.bracketOpenMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
            const trailingBracket = (new TexParser_js_1.default(exports.bracketCloseMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
            exponentNode.childNodes.splice(0, 0, trailingBracket);
            return { numbers: nums, trailing: exponentNode, leading: leadingBracket };
        }]
]);
const listNumberMap = new Map([
    [1, (nums, parser, options) => {
            return (0, numDisplayMethods_1.displayOutputMml)(nums[0], parser, options);
        }],
    [2, (nums, parser, options) => {
            const exponentMapItem = exports.exponentListModeMap.get(options["list-exponents"]);
            const exponentResult = exponentMapItem(nums, parser, options);
            const first = (0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[0], parser, options);
            const separator = (new TexParser_js_1.default(`\\text{${options["list-pair-separator"]}}`, parser.stack.env, parser.configuration)).mml();
            const second = (0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[1], parser, options);
            const root = parser.create('node', 'inferredMrow', [], {});
            if (exponentResult.leading) {
                root.appendChild(exponentResult.leading);
            }
            root.appendChild(first);
            root.appendChild(separator);
            root.appendChild(second);
            if (exponentResult.trailing) {
                root.appendChild(exponentResult.trailing);
            }
            return root;
        }],
    [3, (nums, parser, options) => {
            const exponentMapItem = exports.exponentListModeMap.get(options["list-exponents"]);
            const exponentResult = exponentMapItem(nums, parser, options);
            const root = parser.create('node', 'inferredMrow', [], {});
            if (exponentResult.leading) {
                root.appendChild(exponentResult.leading);
            }
            root.appendChild((0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[0], parser, options));
            for (let i = 1; i < nums.length - 1; i++) {
                const separator = (new TexParser_js_1.default(`\\text{${options["list-separator"]}}`, parser.stack.env, parser.configuration)).mml();
                const next = (0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[i], parser, options);
                root.appendChild(separator);
                root.appendChild(next);
            }
            const finalSeparator = (new TexParser_js_1.default(`\\text{${options["list-final-separator"]}}`, parser.stack.env, parser.configuration)).mml();
            const last = (0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[exponentResult.numbers.length - 1], parser, options);
            root.appendChild(finalSeparator);
            root.appendChild(last);
            if (exponentResult.trailing) {
                root.appendChild(exponentResult.trailing);
            }
            return root;
        }]
]);
function parseList(parser, input, options) {
    const values = input.split(';');
    const nums = values.map(v => {
        return (0, numMethods_1.parseNumber)(parser, v, options);
    });
    return nums;
}
function processNumberList(parser) {
    var _a;
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    let text = parser.GetArgument('num');
    if (globalOptions["parse-numbers"]) {
        // going to assume evaluate expression is processed first, THEN the result is parsed normally
        if (globalOptions["evaluate-expression"]) {
            // TODO Sanitize Evaluate Expression!
            let expression = globalOptions.expression;
            expression = expression.replace('#1', text);
            text = eval(expression).toString();
        }
        const numlist = parseList(parser, text, globalOptions);
        if (globalOptions["list-exponents"] === 'individual') {
            numlist.forEach(v => {
                (0, numPostProcessMethods_1.postProcessNumber)(parser, v, globalOptions);
            });
        }
        else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v, i) => {
                if (i === 0) {
                    (0, numPostProcessMethods_1.postProcessNumber)(parser, v, globalOptions);
                }
                else {
                    (0, numPostProcessMethods_1.postProcessNumber)(parser, v, altOptions);
                }
            });
        }
        const mapItem = (_a = listNumberMap.get(numlist.length)) !== null && _a !== void 0 ? _a : listNumberMap.get(3);
        const mmlNode = mapItem(numlist, parser, globalOptions);
        parser.Push(mmlNode);
    }
    else {
        const mml = (new TexParser_js_1.default(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
        //return [mml];
    }
}
//# sourceMappingURL=numlistMethods.js.map

/***/ },

/***/ 834
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parseProductList = parseProductList;
exports.processNumberProduct = processNumberProduct;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const options_1 = __webpack_require__(878);
const numMethods_1 = __webpack_require__(703);
const numPostProcessMethods_1 = __webpack_require__(258);
const numDisplayMethods_1 = __webpack_require__(85);
const numlistMethods_1 = __webpack_require__(771);
const listNumberMap = new Map([
    [1, (nums, parser, options) => {
            return (0, numDisplayMethods_1.displayOutputMml)(nums[0], parser, options);
        }],
    [3, (nums, parser, options) => {
            const exponentMapItem = numlistMethods_1.exponentListModeMap.get(options["list-exponents"]);
            const exponentResult = exponentMapItem(nums, parser, options);
            const root = parser.create('node', 'inferredMrow', [], {});
            if (exponentResult.leading) {
                root.appendChild(exponentResult.leading);
            }
            root.appendChild((0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[0], parser, options));
            for (let i = 1; i < nums.length; i++) {
                const separator = (new TexParser_js_1.default(options["product-mode"] === 'symbol' ? options["product-symbol"] : `\\text{${options["product-phrase"]}}`, parser.stack.env, parser.configuration)).mml();
                const next = (0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[i], parser, options);
                root.appendChild(separator);
                root.appendChild(next);
            }
            if (exponentResult.trailing) {
                root.appendChild(exponentResult.trailing);
            }
            return root;
        }]
]);
function parseProductList(parser, input, options) {
    const values = input.split('x');
    const nums = values.map(v => {
        return (0, numMethods_1.parseNumber)(parser, v.trim(), options);
    });
    return nums;
}
function processNumberProduct(parser) {
    var _a;
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    let text = parser.GetArgument('num');
    if (globalOptions["parse-numbers"]) {
        // going to assume evaluate expression is processed first, THEN the result is parsed normally
        if (globalOptions["evaluate-expression"]) {
            // TODO Sanitize Evaluate Expression!
            let expression = globalOptions.expression;
            expression = expression.replace('#1', text);
            const result = eval(expression);
            text = result.toString();
        }
        const numlist = parseProductList(parser, text, globalOptions);
        if (globalOptions["product-exponents"] === 'individual') {
            numlist.forEach(v => {
                (0, numPostProcessMethods_1.postProcessNumber)(parser, v, globalOptions);
            });
        }
        else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v, i) => {
                if (i === 0) {
                    (0, numPostProcessMethods_1.postProcessNumber)(parser, v, globalOptions);
                }
                else {
                    (0, numPostProcessMethods_1.postProcessNumber)(parser, v, altOptions);
                }
            });
        }
        const mapItem = (_a = listNumberMap.get(numlist.length)) !== null && _a !== void 0 ? _a : listNumberMap.get(3);
        const mmlNode = mapItem(numlist, parser, globalOptions);
        parser.Push(mmlNode);
    }
    else {
        const mml = (new TexParser_js_1.default(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
        //return [mml];
    }
}
//# sourceMappingURL=numproductMethods.js.map

/***/ },

/***/ 232
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.processNumberRange = processNumberRange;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const options_1 = __webpack_require__(878);
const numMethods_1 = __webpack_require__(703);
const numPostProcessMethods_1 = __webpack_require__(258);
const numDisplayMethods_1 = __webpack_require__(85);
const numlistMethods_1 = __webpack_require__(771);
function processNumberRange(parser) {
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    const first = parser.GetArgument('firstNum');
    const last = parser.GetArgument('lastNum');
    if (globalOptions["parse-numbers"]) {
        const firstNum = (0, numMethods_1.parseNumber)(parser, first, globalOptions);
        const lastNum = (0, numMethods_1.parseNumber)(parser, last, globalOptions);
        if (globalOptions["range-exponents"] === 'individual') {
            (0, numPostProcessMethods_1.postProcessNumber)(parser, firstNum, globalOptions);
            (0, numPostProcessMethods_1.postProcessNumber)(parser, lastNum, globalOptions);
        }
        else {
            const targetExponent = firstNum.exponentSign + firstNum.exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            (0, numPostProcessMethods_1.postProcessNumber)(parser, firstNum, globalOptions);
            (0, numPostProcessMethods_1.postProcessNumber)(parser, lastNum, altOptions);
        }
        const exponentMapItem = numlistMethods_1.exponentListModeMap.get(globalOptions["range-exponents"]);
        const exponentResult = exponentMapItem([firstNum, lastNum], parser, globalOptions);
        const firstMml = (0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[0], parser, globalOptions);
        const separator = (new TexParser_js_1.default(`\\text{${globalOptions["range-phrase"]}}`, parser.stack.env, parser.configuration)).mml();
        const lastMml = (0, numDisplayMethods_1.displayOutputMml)(exponentResult.numbers[1], parser, globalOptions);
        let total = [];
        if (exponentResult.leading) {
            total.push(exponentResult.leading);
        }
        total = total.concat(firstMml).concat(separator).concat(lastMml);
        if (exponentResult.trailing) {
            total = total.concat(exponentResult.trailing);
        }
        total.forEach(v => {
            parser.Push(v);
        });
    }
    else {
        const mml = (new TexParser_js_1.default(first + last, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
        //return [mml];
    }
}
//# sourceMappingURL=numrangeMethods.js.map

/***/ },

/***/ 905
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AngleOptionDefaults = void 0;
const numberOptions_1 = __webpack_require__(761);
exports.AngleOptionDefaults = Object.assign(Object.assign({}, numberOptions_1.NumOptionDefaults), { "angle-mode": 'input', "angle-symbol-degree": '\\degree', "angle-symbol-minute": "'", "angle-symbol-over-decimal": false, "angle-symbol-second": "''", "angle-separator": '', "fill-angle-degrees": false, "fill-angle-minutes": false, "fill-angle-seconds": false, "number-angle-product": '' });
//# sourceMappingURL=angleOptions.js.map

/***/ },

/***/ 799
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ComplexNumberOptionsDefault = void 0;
exports.ComplexNumberOptionsDefault = {
    "complex-angle-unit": 'degrees',
    "complex-mode": 'input',
    "complex-root-position": 'after-number',
    "complex-symbol-angle": '\\angle',
    "complex-symbol-degree": '\\degree',
    "input-complex-root": 'ij',
    "output-complex-root": '\\mathrm{i}',
    "print-complex-unity": false
};
//# sourceMappingURL=complexNumberOptions.js.map

/***/ },

/***/ 66
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ListOptionDefaults = void 0;
exports.ListOptionDefaults = {
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
};
//# sourceMappingURL=listOptions.js.map

/***/ },

/***/ 761
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NumOptionDefaults = exports.NumOutputOptionDefaults = exports.NumPostOptionDefaults = exports.NumParseOptionDefaults = void 0;
exports.NumParseOptionDefaults = {
    "evaluate-expression": false,
    expression: '#1',
    "input-close-uncertainty": ')',
    "input-comparators": '<=>\\approx\\ge\\geq\\gg\\le\\leq\\ll\\sim',
    "input-decimal-markers": '.,',
    "input-digits": '0123456789',
    "input-exponent-markers": 'dDeE',
    "input-ignore": '',
    "input-open-uncertainty": '(',
    "input-signs": '+-\\pm\\mp', // currently using a hack to differentiate between \\pm sign vs uncertaintysign
    "input-uncertainty-signs": '\\pm\\mp',
    "parse-numbers": true,
    "retain-explicit-decimal-marker": false,
    "retain-explicit-plus": false,
    "retain-negative-zero": false,
    "retain-zero-uncertainty": false
};
exports.NumPostOptionDefaults = {
    "drop-exponent": false,
    "drop-uncertainty": false,
    "drop-zero-decimal": false,
    "exponent-mode": 'input',
    "exponent-thresholds": '-3:3',
    "fixed-exponent": 0,
    "minimum-integer-digits": 0,
    "minimum-decimal-digits": 0,
    "round-half": 'up',
    "round-minimum": '0',
    "round-mode": 'none',
    "round-pad": true,
    "round-precision": 2,
    "round-zero-positive": true
};
exports.NumOutputOptionDefaults = {
    "bracket-ambiguous-numbers": true,
    "bracket-negative-numbers": false,
    "digit-group-size": 3,
    "digit-group-first-size": -1, // These should be -1 so we can detect when they've been explicitly set.
    "digit-group-other-size": -1, // Otherwise, digitGroupSize will override them.
    "exponent-base": '10',
    "exponent-product": '\\times',
    "group-digits": 'all',
    "group-minimum-digits": 5,
    "group-separator": '\\,',
    "negative-color": '',
    "output-close-uncertainty": ')',
    "output-decimal-marker": '.',
    "output-exponent-marker": '',
    "output-open-uncertainty": '(',
    "print-implicit-plus": false,
    "print-unity-mantissa": true,
    "print-zero-exponent": false,
    "print-zero-integer": true,
    "tight-spacing": false,
    "uncertainty-descriptor-mode": 'bracket-separator',
    "uncertainty-descriptor-separator": '\\',
    "uncertainty-descriptors": '',
    "uncertainty-mode": 'compact',
    "uncertainty-separator": '',
    "zero-decimal-as-symbol": false,
    "zero-symbol": '\\mbox{---}'
};
exports.NumOptionDefaults = Object.assign(Object.assign(Object.assign({}, exports.NumParseOptionDefaults), exports.NumPostOptionDefaults), exports.NumOutputOptionDefaults);
//# sourceMappingURL=numberOptions.js.map

/***/ },

/***/ 878
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.siunitxDefaults = void 0;
exports.findOptions = findOptions;
exports.processSISetup = processSISetup;
const ParseUtil_js_1 = __webpack_require__(152);
const unitOptions_js_1 = __webpack_require__(72);
const numberOptions_js_1 = __webpack_require__(761);
const angleOptions_js_1 = __webpack_require__(905);
const quantityOptions_js_1 = __webpack_require__(313);
const printOptions_js_1 = __webpack_require__(433);
const complexNumberOptions_js_1 = __webpack_require__(799);
const listOptions_js_1 = __webpack_require__(66);
const errors_js_1 = __webpack_require__(705);
__webpack_require__(978);
exports.siunitxDefaults = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, unitOptions_js_1.UnitOptionDefaults), numberOptions_js_1.NumOptionDefaults), angleOptions_js_1.AngleOptionDefaults), quantityOptions_js_1.QuantityOptionDefaults), complexNumberOptions_js_1.ComplexNumberOptionsDefault), printOptions_js_1.PrintOptionsDefault), listOptions_js_1.ListOptionDefaults);
// originally this function contained a manual version of getting options inside brackets... not necessary anymore
function findOptions(parser, globalOptions) {
    // No good way to extend typing for patch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return optionStringToObject(parser.GetBrackets(parser.currentCS, undefined, true), globalOptions);
}
// // from https://stackoverflow.com/a/10425344/1938624
// function dashToCamel(input: string): string {
// 	return input.toLowerCase().replace(/-(.)/g, (match, group) => {
// 		return group.toUpperCase();
// 	});
// }
// // from https://stackoverflow.com/a/47932848/1938624
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// function camelToDash(str: string): string {
// 	return str.replace(/([A-Z])/g, ($1) => { return "-" + $1.toLowerCase(); });
// }
function processSISetup(parser) {
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const optionsString = parser.GetArgument('sisetup');
    const options = optionStringToObject(optionsString, globalOptions);
    Object.assign(parser.options.siunitx, options);
    // We are adding the sisetup options to the parser options.  These are global once the page is loaded.
    // (the globalOptions variable is just a copy and will reset between each siunitx command)
    // In LaTeX, you can limit these options to grouping curly braces.
    // For MathJAx, you just need to write new delimiters for text: $$ ... $$ 
}
// LaTeX commands (in the value portion) MUST end with a space before using a comma to add another option
function optionStringToObject(optionString, globalOptions) {
    // No good way to extend typing for patch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const optionObject = ParseUtil_js_1.ParseUtil.keyvalOptions(optionString, globalOptions, true, true);
    const options = {};
    for (let [key, value] of Object.entries(optionObject)) {
        const type = typeof globalOptions[key];
        if (typeof value !== type) {
            if (type === 'number' && value.toString().match(/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]\d+)?$/)) {
                value = parseFloat(value.toString());
            }
            else {
                throw errors_js_1.siunitxError.InvalidOptionValue(key, type);
            }
        }
        options[key] = value;
    }
    return options;
}
//# sourceMappingURL=options.js.map

/***/ },

/***/ 978
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const TexError_js_1 = __importDefault(__webpack_require__(446));
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const ParseUtil_js_1 = __webpack_require__(152);
/**
 * Splits a package option list of the form [x=y,z=1] into an attribute list
 * of the form {x: y, z: 1}.
 * @param {string} attrib The attributes of the package.
 * @param {{[key: string]: number}?} allowed A list of allowed options. If
 *     given only allowed arguments are returned.
 * @param {boolean?} error If true, raises an exception if not allowed options
 *     are found.
 * @param {boolean?} l3keys If true, use l3key-style parsing (only remove one set of braces)
 * @return {EnvList} The attribute list.
 */
ParseUtil_js_1.ParseUtil.keyvalOptions = function (attrib, allowed = undefined, error = false, l3keys = false) {
    const def = readKeyval(attrib, l3keys);
    if (allowed) {
        for (const key of Object.keys(def)) {
            // eslint-disable-next-line no-prototype-builtins
            if (!allowed.hasOwnProperty(key)) {
                if (error) {
                    throw new TexError_js_1.default('InvalidOption', 'Invalid option: %1', key);
                }
                delete def[key];
            }
        }
    }
    return def;
};
/**
 * Implementation of the keyval function from https://www.ctan.org/pkg/keyval
 * @param {string} text The optional parameter string for a package or
 *     command.
 * @param {boolean?} l3keys If true, use l3key-style parsing (only remove one set of braces)
 * @return {EnvList} Set of options as key/value pairs.
 */
function readKeyval(text, l3keys = false) {
    const options = {};
    let rest = text;
    let end, key, val;
    let dropBrace = true;
    while (rest) {
        [key, end, rest] = readValue(rest, ['=', ','], l3keys, dropBrace);
        dropBrace = false;
        if (end === '=') {
            [val, end, rest] = readValue(rest, [','], l3keys);
            val = (val === 'false' || val === 'true') ?
                JSON.parse(val) : val;
            options[key] = val;
        }
        else if (key) {
            options[key] = true;
        }
    }
    return options;
}
/**
 * Removes pairs of outer braces.
 * @param {string} text The string to clean.
 * @param {number} count The number of outer braces to slice off.
 * @return {string} The cleaned string.
 */
function removeBraces(text, count) {
    if (count === 0) {
        return text.replace(/^\s+/, '')
            .replace(/([^\\\s]|^)((?:\\\\)*(?:\\\s)?)?\s+$/, '$1$2');
    }
    while (count > 0) {
        text = text.trim().slice(1, -1);
        count--;
    }
    return text;
}
/**
 * Read a value from the given string until an end parameter is reached or
 * string is exhausted.
 * @param {string} text The string to process.
 * @param {string[]} end List of possible end characters.
 * @param {boolean?} l3keys If true, use l3key-style parsing (only remove one set of braces)
 * @param {boolean?} dropBrace True if the outermost braces should be dropped
 * @return {[string, string, string]} The collected value, the actual end
 *     character, and the rest of the string still to parse.
 */
function readValue(text, end, l3keys = false, dropBrace = false) {
    const length = text.length;
    let braces = 0;
    let value = '';
    let index = 0;
    let start = 0; // Counter for the starting left braces.
    let countBraces = true; // Flag for counting starting left braces.
    // after starting braces, but no other char yet.
    while (index < length) {
        const c = text[index++];
        switch (c) {
            case '\\': // Handle control sequences (in particular, \{ and \})
                value += c + (text[index++] || '');
                countBraces = false;
                continue;
            case ' ': // Ignore spaces.
                break;
            case '{':
                if (countBraces) { // Count open left braces at start.
                    start++;
                }
                braces++;
                break;
            case '}':
                if (!braces) { // Closing braces.
                    throw new TexError_js_1.default('ExtraCloseMissingOpen', 'Extra close brace or missing open brace');
                }
                braces--;
                countBraces = false; // Stop counting start left braces.
                break;
            default:
                if (!braces && end.indexOf(c) !== -1) { // End character reached.
                    return [removeBraces(value, l3keys ? Math.min(1, start) : start), c, text.slice(index)];
                }
                if (start > braces) { // Some start left braces have been closed.
                    start = braces;
                }
                countBraces = false;
        }
        value += c;
    }
    if (braces) {
        throw new TexError_js_1.default('ExtraOpenMissingClose', 'Extra open brace or missing close brace');
    }
    return (dropBrace && start) ? ['', '', removeBraces(value, 1)] :
        [removeBraces(value, l3keys ? Math.min(1, start) : start), '', text.slice(index)];
}
/**
 * Get an optional LaTeX argument in brackets.
 * @param {string} _name Name of the current control sequence.
 * @param {string?} def The default value for the optional argument.
 * @param {boolean=} matchBrackets True if indernal brackets must match.
 * @return {string} The optional argument.
 */
TexParser_js_1.default.prototype.GetBrackets = function (_name, def, matchBrackets = false) {
    if (this.GetNext() !== '[') {
        return def || "";
    }
    // eslint-disable-next-line prefer-const
    let j = ++this.i, braces = 0, brackets = 0;
    while (this.i < this.string.length) {
        switch (this.string.charAt(this.i++)) {
            case '{':
                braces++;
                break;
            case '\\':
                this.i++;
                break;
            case '}':
                if (braces-- <= 0) {
                    throw new TexError_js_1.default('ExtraCloseLooking', 'Extra close brace while looking for %1', '\']\'');
                }
                break;
            case '[':
                if (braces === 0)
                    brackets++;
                break;
            case ']':
                if (braces === 0) {
                    if (!matchBrackets || brackets === 0) {
                        return this.string.slice(j, this.i - 1);
                    }
                    brackets--;
                }
                break;
        }
    }
    throw new TexError_js_1.default('MissingCloseBracket', 'Could not find closing \']\' for argument to %1', this.currentCS);
};
//# sourceMappingURL=patch.js.map

/***/ },

/***/ 433
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PrintOptionsDefault = void 0;
exports.PrintOptionsDefault = {
    color: '',
    mode: 'math',
    "number-color": '',
    numberMode: 'math',
    propagateMathFont: false,
    resetMathVersion: true,
    resetTextFamily: true,
    resetTextSeries: true,
    resetTextShape: true,
    textFamilyToMath: false,
    textFontCommand: '',
    textSubscriptCommand: '\\textsubscript',
    textSuperscriptCommand: '\\textsuperscript',
    textSeriesToMath: false,
    "unit-color": '',
    unitMode: 'math'
};
//# sourceMappingURL=printOptions.js.map

/***/ },

/***/ 313
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.QuantityOptionDefaults = void 0;
const numberOptions_1 = __webpack_require__(761);
const unitOptions_1 = __webpack_require__(72);
exports.QuantityOptionDefaults = Object.assign(Object.assign(Object.assign({}, numberOptions_1.NumOptionDefaults), unitOptions_1.UnitOptionDefaults), { "allow-quantity-breaks": false, "extract-mass-in-kilograms": true, "prefix-mode": 'input', "quantity-product": '\\,', "separate-uncertainty-units": 'bracket' });
//# sourceMappingURL=quantityOptions.js.map

/***/ },

/***/ 72
(__unused_webpack_module, exports) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UnitOptionDefaults = void 0;
exports.UnitOptionDefaults = {
    "bracket-unit-denominator": true,
    "forbid-literal-units": false,
    "fraction-command": '\\frac',
    "inter-unit-product": '\\,',
    "parse-units": true,
    "per-mode": 'power',
    "display-per-mode": 'perMode',
    "inline-per-mode": 'perMode',
    "per-symbol-script-correction": '\\!',
    "per-symbol": '/',
    "power-half-as-sqrt": false,
    "qualifier-mode": 'subscript',
    "qualifier-phrase": '',
    "sticky-per": false,
    "unit-font-command": '\\mathrm'
};
//# sourceMappingURL=unitOptions.js.map

/***/ },

/***/ 471
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.prefixModeMap = void 0;
exports.createQuantityProductMml = createQuantityProductMml;
exports.createUnitsNode = createUnitsNode;
exports.processQuantity = processQuantity;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const numDisplayMethods_1 = __webpack_require__(85);
const numMethods_1 = __webpack_require__(703);
const numPostProcessMethods_1 = __webpack_require__(258);
const options_1 = __webpack_require__(878);
const unitMethods_1 = __webpack_require__(249);
const units_1 = __webpack_require__(474);
function combineExponent(parser, num, units, options) {
    if (!num.exponent || (!units || units.length === 0)) {
        return;
    }
    const exponent = +(num.exponentSign + num.exponent);
    let targetExponent = 0;
    for (const power of units_1.prefixPower.values()) {
        if (power >= exponent) {
            targetExponent = power;
        }
        else {
            break;
        }
    }
    const firstUnit = units[0];
    // prefix can be undefined, empty, or string... this specifically checks for empty
    if (firstUnit.prefix) {
        const unitPower = (firstUnit.power ? +(firstUnit.power) : 1) * (firstUnit.position === 'denominator' ? -1 : 1);
        const addedPower = firstUnit.prefix ? units_1.prefixPower.get(firstUnit.prefix) : 1;
        targetExponent += addedPower * unitPower;
        // just in case prefix was cm (2) and we added 3, there's no prefix for 5
        while (!units_1.prefixPower.revHas(targetExponent)) {
            targetExponent++;
        }
    }
    // set new prefix
    firstUnit.prefix = units_1.prefixPower.revGet(targetExponent);
    const newExponent = targetExponent - exponent;
    num.exponent = (Math.abs(newExponent)).toString();
    num.exponentSign = Math.sign(newExponent) > 0 ? '' : '-';
    (0, numPostProcessMethods_1.convertToFixed)(parser, num, options);
}
function extractExponent(parser, num, units, options) {
    if (units === null) {
        return;
    }
    let powersOfTen = 0;
    //let powersOfTwo = 0;
    for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        // run only if 
        // 1. prefix is present for all units except grams
        // 2. prefix is present for grams when !extractMassInKilograms
        // 2. prefix is not k for grams when extractMassInKilograms // special case
        if ((unit.symbol !== 'g' && unit.prefix !== '') || (unit.symbol === 'g' && unit.prefix !== '' && !options["extract-mass-in-kilograms"])) {
            const unitPower = ((unit.power !== undefined && unit.power !== null) ? +(unit.power) : 1) * (unit.position === 'denominator' ? -1 : 1);
            // if (binaryPrefixPower.has(unit.prefix)){
            // 	const prefPower = binaryPrefixPower.get(unit.prefix);
            // 	powersOfTwo += (prefPower*unitPower);
            // } else {
            if (unit.prefix && units_1.prefixPower.has(unit.prefix)) {
                const prefPower = units_1.prefixPower.get(unit.prefix);
                powersOfTen += (prefPower * unitPower);
            }
            else {
                // Don't do anything to this prefix.  Can't convert it. Next unit...
                continue;
            }
            unit.prefix = '';
        }
        else if (unit.symbol === 'g' && unit.prefix !== 'k' && options["extract-mass-in-kilograms"]) {
            const unitPower = ((unit.power !== undefined && unit.power !== null) ? +(unit.power) : 1) * (unit.position === 'denominator' ? -1 : 1);
            if (unit.prefix && units_1.prefixPower.has(unit.prefix)) {
                const prefPower = units_1.prefixPower.get(unit.prefix);
                powersOfTen += (prefPower * unitPower) - 3;
            }
            else {
                // this unit has no prefix...
                powersOfTen = -3;
            }
            unit.prefix = 'k';
        }
    }
    const currentExponent = (num.exponent ? +(num.exponentSign + num.exponent) : 0);
    const newExponent = currentExponent + powersOfTen;
    num.exponent = Math.abs(newExponent).toString();
    num.exponentSign = Math.sign(newExponent) > 0 ? '' : '-';
    if (!num.exponentMarker) {
        num.exponentMarker = 'e';
    }
}
exports.prefixModeMap = new Map([
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    ['input', () => { }],
    ['combine-exponent', combineExponent],
    ['extract-exponent', extractExponent]
]);
function findUncertaintyNode(root) {
    for (const x of root.childNodes) {
        const mmlNode = x;
        if (mmlNode) {
            if (mmlNode.attributes) {
                const names = mmlNode.attributes.getExplicitNames();
                if (names.indexOf('data-siunitx-uncertainty') !== -1) {
                    return mmlNode;
                }
            }
            const result = findUncertaintyNode(mmlNode);
            if (result) {
                return result;
            }
        }
    }
    return null;
}
const separateUncertaintyUnitsMmlMap = new Map([
    ['single', (num, units, quantityProduct, parser, _options) => {
            const root = parser.create('node', 'inferredMrow', [], {});
            root.appendChild(num);
            root.appendChild(quantityProduct);
            root.appendChild(units);
            return root;
        }],
    ['bracket', (num, units, quantityProduct, parser, options) => {
            const root = parser.create('node', 'inferredMrow', [], {});
            let uncertaintyNode = undefined;
            for (const x of num.childNodes) {
                const result = findUncertaintyNode(x);
                if (result) {
                    uncertaintyNode = result;
                    break;
                }
            }
            if (uncertaintyNode) {
                const leftBracket = parser.create('token', 'mo', {}, options["output-open-uncertainty"]);
                const rightBracket = parser.create('token', 'mo', {}, options["output-close-uncertainty"]);
                root.appendChild(leftBracket);
                root.appendChild(num);
                root.appendChild(rightBracket);
                root.appendChild(quantityProduct);
                root.appendChild(units);
                return root;
            }
            else {
                root.appendChild(num);
                root.appendChild(quantityProduct);
                root.appendChild(units);
                return root;
            }
        }],
    ['repeat', (num, units, quantityProduct, parser, _options) => {
            let uncertaintyNode = undefined;
            for (const x of num.childNodes) {
                const result = findUncertaintyNode(x);
                if (result) {
                    uncertaintyNode = result;
                    break;
                }
            }
            if (uncertaintyNode) {
                const parent = uncertaintyNode.parent;
                const uncertaintyPosition = parent.childNodes.indexOf(uncertaintyNode);
                if (!quantityProduct) {
                    parent.childNodes.splice(uncertaintyPosition, 0, units);
                    parent.appendChild(units);
                }
                else {
                    parent.childNodes.splice(uncertaintyPosition, 0, quantityProduct, units);
                    // To make it match the MathML structure of the previous insert,
                    // we should insert the 2nd unit at the same depth.
                    // However, SRE seems to rearrange it all anyways.
                    parent.appendChild(quantityProduct);
                    parent.appendChild(units);
                }
                return num;
            }
            else {
                const root = parser.create('node', 'inferredMrow', [], {});
                root.appendChild(num);
                root.appendChild(quantityProduct);
                root.appendChild(units);
                return root;
            }
        }]
]);
const separateUncertaintyUnitsMap = new Map([
    ['single', (num, units, options) => {
            return num + options["quantity-product"] + units;
        }],
    ['bracket', (num, units, options) => {
            if (num.indexOf('\\pm') === -1) {
                return num + options["quantity-product"] + units;
            }
            return options["output-open-uncertainty"] + num + options["output-close-uncertainty"] + options["quantity-product"] + units;
        }],
    ['repeat', (num, units, options) => {
            // split the num from the uncertainty, split on \\pm
            const split = num.split('\\pm');
            let separate = '';
            for (let i = 0; i < split.length; i++) {
                if (separate) {
                    separate += '\\pm';
                }
                separate += split[i];
                separate += options["quantity-product"];
                separate += units;
            }
            return separate;
        }]
]);
function createQuantityProductMml(parser, options) {
    let quantityProductNode = undefined;
    const trimmedQuantityProduct = options["quantity-product"].trimStart();
    if (trimmedQuantityProduct) {
        const spacerNode = (new TexParser_js_1.default(trimmedQuantityProduct, parser.stack.env, parser.configuration)).mml();
        const spacerUnicode = (0, numDisplayMethods_1.findInnerText)(spacerNode);
        quantityProductNode = parser.create('token', 'mo', {}, spacerUnicode);
    }
    else {
        quantityProductNode = parser.create('token', 'mo', {});
    }
    return quantityProductNode;
}
function createUnitsNode(unitLatex, parser, options) {
    let unitNode = (new TexParser_js_1.default(unitLatex, parser.stack.env, parser.configuration)).mml();
    const quantityProductNode = createQuantityProductMml(parser, options);
    if (quantityProductNode) {
        const root = parser.create('node', 'inferredMrow', [], {});
        root.appendChild(quantityProductNode);
        root.appendChild(unitNode);
        unitNode = root;
    }
    return unitNode;
}
function processQuantity(parser) {
    var _a;
    let globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    let numString = parser.GetArgument('num');
    const unitString = parser.GetArgument('unit');
    let unitDisplay = '';
    const isLiteral = (unitString.indexOf('\\') === -1);
    const unitPieces = (0, unitMethods_1.parseUnit)(parser, unitString, globalOptions, localOptions, isLiteral);
    if (globalOptions["parse-numbers"]) {
        // going to assume evaluate expression is processed first, THEN the result is parsed normally
        if (globalOptions["evaluate-expression"]) {
            // TODO Sanitize Evaluate Expression!
            let expression = globalOptions.expression;
            expression = expression.replace('#1', numString);
            numString = eval(expression).toString();
        }
        // refresh global options from default
        globalOptions = Object.assign({}, parser.options.siunitx);
        Object.assign(globalOptions, localOptions);
        const num = (0, numMethods_1.parseNumber)(parser, numString, globalOptions);
        // convert number and unit if necessary
        (_a = exports.prefixModeMap.get(globalOptions["prefix-mode"])) === null || _a === void 0 ? void 0 : _a(parser, num, unitPieces, globalOptions);
        (0, numPostProcessMethods_1.postProcessNumber)(parser, num, globalOptions);
        const numDisplay = (0, numDisplayMethods_1.displayOutputMml)(num, parser, globalOptions);
        // Need to process this after number because some options alter unit prefixes
        unitDisplay = (0, unitMethods_1.displayUnits)(parser, unitPieces, globalOptions, isLiteral);
        const unitNode = (new TexParser_js_1.default(unitDisplay, parser.stack.env, parser.configuration)).mml();
        const quantityProductNode = createQuantityProductMml(parser, globalOptions);
        if (quantityProductNode) {
            const qtyDisplay = separateUncertaintyUnitsMmlMap.get(globalOptions["separate-uncertainty-units"])(numDisplay, unitNode, quantityProductNode, parser, globalOptions);
            parser.Push(qtyDisplay);
        }
    }
    else {
        // can't do any conversions with number since processing is off
        const numDisplay = numString;
        // Need to process this after number because some options alter unit prefixes
        unitDisplay = (0, unitMethods_1.displayUnits)(parser, unitPieces, globalOptions, isLiteral);
        const qtyDisplay = separateUncertaintyUnitsMap.get(globalOptions["separate-uncertainty-units"])(numDisplay, unitDisplay, globalOptions);
        const qtyNode = (new TexParser_js_1.default(qtyDisplay, parser.stack.env, parser.configuration)).mml();
        parser.Push(qtyNode);
    }
}
//# sourceMappingURL=qtyMethods.js.map

/***/ },

/***/ 3
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.unitListModeMap = void 0;
exports.processQuantityList = processQuantityList;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const options_1 = __webpack_require__(878);
const numPostProcessMethods_1 = __webpack_require__(258);
const numDisplayMethods_1 = __webpack_require__(85);
const numlistMethods_1 = __webpack_require__(771);
const unitMethods_1 = __webpack_require__(249);
const qtyMethods_1 = __webpack_require__(471);
function singleExponent(exponentResult, unitLatex, parser, options) {
    const numNodes = exponentResult.numbers.map(v => {
        const numNode = (0, numDisplayMethods_1.displayOutputMml)(v, parser, options);
        return numNode;
    });
    const unitNode = (0, qtyMethods_1.createUnitsNode)(unitLatex, parser, options);
    if (exponentResult.trailing) {
        exponentResult.trailing.appendChild(unitNode);
    }
    else {
        exponentResult.trailing = parser.create('node', 'inferredMrow', [], {});
        exponentResult.trailing.appendChild(unitNode);
    }
    return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
}
function bracketExponent(exponentResult, unitLatex, parser, options) {
    const numNodes = exponentResult.numbers.map(v => {
        const numNode = (0, numDisplayMethods_1.displayOutputMml)(v, parser, options);
        return numNode;
    });
    if (!exponentResult.leading) {
        exponentResult.leading = parser.create('node', 'inferredMrow', [], {});
        const leadingBracket = (new TexParser_js_1.default(numlistMethods_1.bracketOpenMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        exponentResult.leading.appendChild(leadingBracket);
    }
    if (!exponentResult.trailing) {
        exponentResult.trailing = parser.create('node', 'inferredMrow', [], {});
    }
    if (options["list-exponents"] !== 'combine-bracket') {
        const trailingBracket = (new TexParser_js_1.default(numlistMethods_1.bracketCloseMap.get(parser.currentCS)(options), parser.stack.env, parser.configuration)).mml();
        if (options["list-exponents"] === 'individual') {
            //override collection of exponents by clearing them out
            exponentResult.trailing = parser.create('node', 'inferredMrow', [], {});
        }
        exponentResult.trailing.appendChild(trailingBracket);
    }
    const unitNode = (0, qtyMethods_1.createUnitsNode)(unitLatex, parser, options);
    exponentResult.trailing.appendChild(unitNode);
    return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
}
exports.unitListModeMap = new Map([
    ['repeat', (exponentResult, unitLatex, parser, options) => {
            const numNodes = exponentResult.numbers.map(v => {
                const root = parser.create('node', 'inferredMrow', [], {});
                const numNode = (0, numDisplayMethods_1.displayOutputMml)(v, parser, options);
                root.appendChild(numNode);
                const unitNode = (0, qtyMethods_1.createUnitsNode)(unitLatex, parser, options);
                root.appendChild(unitNode);
                return root;
            });
            return { numbers: numNodes, leading: exponentResult.leading, trailing: exponentResult.trailing };
        }],
    ['single', singleExponent],
    ['bracket', bracketExponent],
    ['power', singleExponent],
    ['bracket-power', bracketExponent]
]);
const listNumberMap = new Map([
    [1, (nums, unitLatex, parser, options) => {
            const root = parser.create('node', 'inferredMrow', [], {});
            const numMml = (0, numDisplayMethods_1.displayOutputMml)(nums[0], parser, options);
            root.appendChild(numMml);
            const unitNode = (0, qtyMethods_1.createUnitsNode)(unitLatex, parser, options);
            root.appendChild(unitNode);
            return root;
        }],
    [2, (nums, unitLatex, parser, options) => {
            const exponentMapItem = numlistMethods_1.exponentListModeMap.get(options["list-exponents"]);
            const exponentResult = exponentMapItem(nums, parser, options);
            const unitsMapItem = exports.unitListModeMap.get(options["list-units"]);
            const unitsResult = unitsMapItem(exponentResult, unitLatex, parser, options);
            const root = parser.create('node', 'inferredMrow', [], {});
            if (unitsResult.leading) {
                root.appendChild(unitsResult.leading);
            }
            root.appendChild(unitsResult.numbers[0]);
            const separator = (new TexParser_js_1.default(`\\text{${options["list-pair-separator"]}}`, parser.stack.env, parser.configuration)).mml();
            root.appendChild(separator);
            root.appendChild(unitsResult.numbers[1]);
            if (unitsResult.trailing) {
                root.appendChild(unitsResult.trailing);
            }
            return root;
        }],
    [3, (nums, unitLatex, parser, options) => {
            const exponentMapItem = numlistMethods_1.exponentListModeMap.get(options["list-units"] === 'single' ? 'individual' : options["list-exponents"]);
            const exponentResult = exponentMapItem(nums, parser, options);
            const unitsMapItem = exports.unitListModeMap.get(options["list-units"]);
            const unitsResult = unitsMapItem(exponentResult, unitLatex, parser, options);
            const root = parser.create('node', 'inferredMrow', [], {});
            if (unitsResult.leading) {
                root.appendChild(unitsResult.leading);
            }
            root.appendChild(unitsResult.numbers[0]);
            const separator = (new TexParser_js_1.default(`\\text{${options["list-separator"]}}`, parser.stack.env, parser.configuration)).mml();
            for (let i = 1; i < nums.length - 1; i++) {
                root.appendChild(separator);
                root.appendChild(unitsResult.numbers[i]);
            }
            const finalSeparator = (new TexParser_js_1.default(`\\text{${options["list-final-separator"]}}`, parser.stack.env, parser.configuration)).mml();
            root.appendChild(finalSeparator);
            root.appendChild(unitsResult.numbers[unitsResult.numbers.length - 1]);
            if (unitsResult.trailing) {
                root.appendChild(unitsResult.trailing);
            }
            return root;
        }]
]);
function processQuantityList(parser) {
    var _a;
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    const text = parser.GetArgument('num');
    const unitString = parser.GetArgument('unit');
    const isLiteral = (unitString.indexOf('\\') === -1);
    const unitPieces = (0, unitMethods_1.parseUnit)(parser, unitString, globalOptions, localOptions, isLiteral);
    if (globalOptions["parse-numbers"]) {
        const numlist = (0, numlistMethods_1.parseList)(parser, text, globalOptions);
        // // convert number and unit if necessary, use first number in list only
        // prefixModeMap.get(globalOptions.prefixMode)?.(numlist[0], unitPieces, globalOptions);
        // list-units=repeat requires list-exponents=individual, so override if necessary
        if (globalOptions["list-units"] === 'repeat') {
            globalOptions["list-exponents"] = 'individual';
        }
        // seems both have to be set to have the list printed plainly, any changes in units display will affect exponents display and v.v.
        if (globalOptions["list-exponents"] === 'individual') {
            numlist.forEach(v => {
                (0, numPostProcessMethods_1.postProcessNumber)(parser, v, globalOptions);
            });
        }
        else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v, i) => {
                if (i === 0) {
                    (0, numPostProcessMethods_1.postProcessNumber)(parser, v, globalOptions);
                }
                else {
                    (0, numPostProcessMethods_1.postProcessNumber)(parser, v, altOptions);
                }
            });
        }
        // Need to process this after number because some options alter unit prefixes
        const unitLatex = (0, unitMethods_1.displayUnits)(parser, unitPieces, globalOptions, isLiteral);
        const mapItem = (_a = listNumberMap.get(numlist.length)) !== null && _a !== void 0 ? _a : listNumberMap.get(3);
        parser.Push(mapItem(numlist, unitLatex, parser, globalOptions));
    }
    else {
        const mml = (new TexParser_js_1.default(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
        //return [mml];
    }
}
//# sourceMappingURL=qtylistMethods.js.map

/***/ },

/***/ 122
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.processQuantityProduct = processQuantityProduct;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const options_1 = __webpack_require__(878);
const numPostProcessMethods_1 = __webpack_require__(258);
const numDisplayMethods_1 = __webpack_require__(85);
const numlistMethods_1 = __webpack_require__(771);
const numproductMethods_1 = __webpack_require__(834);
const unitMethods_1 = __webpack_require__(249);
const qtylistMethods_1 = __webpack_require__(3);
const listNumberMap = new Map([
    [1, (nums, unitLatex, parser, options) => {
            const root = parser.create('node', 'inferredMrow', [], {});
            const node = (0, numDisplayMethods_1.displayOutputMml)(nums[0], parser, options);
            root.appendChild(node);
            const unitNode = (new TexParser_js_1.default(unitLatex, parser.stack.env, parser.configuration)).mml();
            root.appendChild(unitNode);
            return root;
        }],
    [3, (nums, unitLatex, parser, options) => {
            const exponentMapItem = numlistMethods_1.exponentListModeMap.get(options["list-exponents"]);
            const exponentResult = exponentMapItem(nums, parser, options);
            const unitsMapItem = qtylistMethods_1.unitListModeMap.get(options["product-units"]);
            const unitsResult = unitsMapItem(exponentResult, unitLatex, parser, options);
            const root = parser.create('node', 'inferredMrow', [], {});
            if (unitsResult.leading) {
                root.appendChild(unitsResult.leading);
            }
            //total = total.concat(displayOutputMml(exponentResult.numbers[0], parser, options));
            root.appendChild(unitsResult.numbers[0]);
            for (let i = 1; i < nums.length; i++) {
                const separator = (new TexParser_js_1.default(options["product-mode"] === 'symbol' ? options["product-symbol"] : `\\text{${options["product-phrase"]}}`, parser.stack.env, parser.configuration)).mml();
                //const next = displayOutputMml(exponentResult.numbers[i], parser, options);
                root.appendChild(separator);
                root.appendChild(unitsResult.numbers[i]);
            }
            if (unitsResult.trailing) {
                root.appendChild(unitsResult.trailing);
            }
            return root;
        }]
]);
function processQuantityProduct(parser) {
    var _a;
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    let text = parser.GetArgument('num');
    const unitString = parser.GetArgument('unit');
    const isLiteral = (unitString.indexOf('\\') === -1);
    const unitPieces = (0, unitMethods_1.parseUnit)(parser, unitString, globalOptions, localOptions, isLiteral);
    if (globalOptions["parse-numbers"]) {
        // going to assume evaluate expression is processed first, THEN the result is parsed normally
        if (globalOptions["evaluate-expression"]) {
            // TODO Sanitize Evaluate Expression!
            let expression = globalOptions.expression;
            expression = expression.replace('#1', text);
            text = eval(expression).toString();
        }
        const numlist = (0, numproductMethods_1.parseProductList)(parser, text, globalOptions);
        if (globalOptions["product-exponents"] === 'individual') {
            numlist.forEach(v => {
                (0, numPostProcessMethods_1.postProcessNumber)(parser, v, globalOptions);
            });
        }
        else {
            const targetExponent = numlist[0].exponentSign + numlist[0].exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            numlist.forEach((v, i) => {
                if (i === 0) {
                    (0, numPostProcessMethods_1.postProcessNumber)(parser, v, globalOptions);
                }
                else {
                    (0, numPostProcessMethods_1.postProcessNumber)(parser, v, altOptions);
                }
            });
        }
        // Need to process this after number because some options alter unit prefixes
        if (globalOptions["product-units"] === 'power' || globalOptions["product-units"] === 'bracket-power') {
            const multiplier = numlist.length;
            unitPieces.forEach(v => {
                if (v.power) {
                    v.power = v.power * multiplier;
                }
                else {
                    v.power = multiplier;
                }
            });
        }
        const unitLatex = (0, unitMethods_1.displayUnits)(parser, unitPieces, globalOptions, isLiteral);
        const mapItem = (_a = listNumberMap.get(numlist.length)) !== null && _a !== void 0 ? _a : listNumberMap.get(3);
        const mmlNode = mapItem(numlist, unitLatex, parser, globalOptions);
        parser.Push(mmlNode);
    }
    else {
        const mml = (new TexParser_js_1.default(text, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
        //return [mml];
    }
}
//# sourceMappingURL=qtyproductMethods.js.map

/***/ },

/***/ 712
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.processQuantityRange = processQuantityRange;
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const options_1 = __webpack_require__(878);
const numMethods_1 = __webpack_require__(703);
const numPostProcessMethods_1 = __webpack_require__(258);
const numlistMethods_1 = __webpack_require__(771);
const unitMethods_1 = __webpack_require__(249);
const qtylistMethods_1 = __webpack_require__(3);
function processQuantityRange(parser) {
    const globalOptions = Object.assign({}, parser.options.siunitx);
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    Object.assign(globalOptions, localOptions);
    const first = parser.GetArgument('firstNum');
    const last = parser.GetArgument('lastNum');
    const unitString = parser.GetArgument('unit');
    const isLiteral = (unitString.indexOf('\\') === -1);
    const unitPieces = (0, unitMethods_1.parseUnit)(parser, unitString, globalOptions, localOptions, isLiteral);
    if (globalOptions["parse-numbers"]) {
        const firstNum = (0, numMethods_1.parseNumber)(parser, first, globalOptions);
        const lastNum = (0, numMethods_1.parseNumber)(parser, last, globalOptions);
        if (globalOptions["range-exponents"] === 'individual') {
            (0, numPostProcessMethods_1.postProcessNumber)(parser, firstNum, globalOptions);
            (0, numPostProcessMethods_1.postProcessNumber)(parser, lastNum, globalOptions);
        }
        else {
            const targetExponent = firstNum.exponentSign + firstNum.exponent;
            const altOptions = Object.assign(globalOptions, { exponentMode: 'fixed', fixedExponent: targetExponent });
            (0, numPostProcessMethods_1.postProcessNumber)(parser, firstNum, globalOptions);
            (0, numPostProcessMethods_1.postProcessNumber)(parser, lastNum, altOptions);
        }
        // Need to process this after number because some options alter unit prefixes
        const unitLatex = (0, unitMethods_1.displayUnits)(parser, unitPieces, globalOptions, isLiteral);
        const exponentMapItem = numlistMethods_1.exponentListModeMap.get(globalOptions["range-exponents"]);
        const exponentResult = exponentMapItem([firstNum, lastNum], parser, globalOptions);
        const unitsMapItem = qtylistMethods_1.unitListModeMap.get(globalOptions["range-units"]);
        const unitsResult = unitsMapItem(exponentResult, unitLatex, parser, globalOptions);
        const separator = (new TexParser_js_1.default(`\\text{${globalOptions["range-phrase"]}}`, parser.stack.env, parser.configuration)).mml();
        const root = parser.create('node', 'inferredMrow', [], {});
        if (exponentResult.leading) {
            root.appendChild(exponentResult.leading);
        }
        root.appendChild(unitsResult.numbers[0]);
        root.appendChild(separator);
        root.appendChild(unitsResult.numbers[1]);
        if (exponentResult.trailing) {
            root.appendChild(exponentResult.trailing);
        }
        parser.Push(root);
    }
    else {
        const mml = (new TexParser_js_1.default(first + last, parser.stack.env, parser.configuration)).mml();
        parser.Push(mml);
    }
}
//# sourceMappingURL=qtyrangeMethods.js.map

/***/ },

/***/ 603
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UserDefinedUnitOptionsKey = exports.UserDefinedUnitsKey = void 0;
const Configuration_js_1 = __webpack_require__(477);
const TokenMap_js_1 = __webpack_require__(170);
const angMethods_1 = __webpack_require__(131);
const numMethods_1 = __webpack_require__(703);
const options_1 = __webpack_require__(878);
const qtyMethods_1 = __webpack_require__(471);
const unitMethods_1 = __webpack_require__(249);
const aria_label_1 = __webpack_require__(331);
const NodeUtil_js_1 = __importDefault(__webpack_require__(180));
const Token_js_1 = __webpack_require__(782);
const TexConstants_js_1 = __webpack_require__(17);
const complexMethods_1 = __webpack_require__(463);
const numlistMethods_1 = __webpack_require__(771);
const numproductMethods_1 = __webpack_require__(834);
const numrangeMethods_1 = __webpack_require__(232);
const qtylistMethods_1 = __webpack_require__(3);
const qtyrangeMethods_1 = __webpack_require__(712);
const qtyproductMethods_1 = __webpack_require__(122);
__webpack_require__(978);
const methodMap = {
    "\\num": (parser) => {
        parser.Push((0, numMethods_1.processNumber)(parser));
    },
    "\\ang": (parser) => {
        parser.Push((0, angMethods_1.processAngle)(parser));
    },
    "\\unit": (parser) => {
        parser.Push((0, unitMethods_1.processUnit)(parser));
    },
    "\\qty": (parser) => {
        (0, qtyMethods_1.processQuantity)(parser); // doesn't return a node, pushes internally
    },
    "\\numlist": (parser) => {
        (0, numlistMethods_1.processNumberList)(parser);
    },
    "\\qtylist": (parser) => {
        (0, qtylistMethods_1.processQuantityList)(parser);
    },
    "\\numproduct": (parser) => {
        (0, numproductMethods_1.processNumberProduct)(parser);
    },
    "\\qtyproduct": (parser) => {
        (0, qtyproductMethods_1.processQuantityProduct)(parser);
    },
    "\\numrange": (parser) => {
        (0, numrangeMethods_1.processNumberRange)(parser);
    },
    "\\qtyrange": (parser) => {
        (0, qtyrangeMethods_1.processQuantityRange)(parser);
    },
    "\\complexnum": (parser) => {
        parser.Push((0, complexMethods_1.processComplexNumber)(parser));
    },
    "\\complexqty": (parser) => {
        (0, complexMethods_1.processComplexQuantity)(parser);
    },
    "@{}S": (_parser) => {
        //TODO: NOT IMPLEMENTED
        // no tabular in MathJax, but maybe use \\begin{array} ?  or pure html somehow
    },
    "\\tablenum": (_parser) => {
        //TODO: NOT IMPLEMENTED
    },
    "\\sisetup": (parser) => {
        (0, options_1.processSISetup)(parser);
    },
    "\\DeclareSIUnit": (parser) => {
        const packageData = parser.configuration.packageData.get("siunitx");
        const userDefinedUnits = packageData[exports.UserDefinedUnitsKey];
        const userDefinedUnitOptions = packageData[exports.UserDefinedUnitOptionsKey];
        const options = (0, options_1.findOptions)(parser, options_1.siunitxDefaults);
        const newUnitMacro = parser.GetArgument("DeclareSIUnit");
        const newToken = parser.GetArgument("DeclareSIUnit");
        userDefinedUnits.set(newUnitMacro, newToken);
        if (options !== undefined) {
            userDefinedUnitOptions.set(newUnitMacro, options);
        }
    },
    "\\DeclareSIQualifier": (_parser) => {
        //TODO: DeclareSIQualifier (eg g_{salt} for "grams of salt")
    },
    "\\DeclareSIPower": (_parser) => {
        //TODO: DeclareSIPower  (eg \square,\cubic,\squared,\cubed)
    },
};
exports.UserDefinedUnitsKey = "siunitxUnits";
exports.UserDefinedUnitOptionsKey = "siunitxUnitOptions";
function angleChars(parser, mchar) {
    if (mchar && mchar instanceof Token_js_1.Token) {
        const def = mchar.attributes || {};
        def.mathvariant = TexConstants_js_1.TexConstant.Variant.NORMAL;
        def.class = "MathML-Unit";
        const emptyToken = parser.create("token", "mi");
        const symbolToken = parser.create("token", "mi", def, mchar.char);
        const msupNode = parser.create("node", "msup", [emptyToken, symbolToken]);
        parser.Push(msupNode);
    }
}
new TokenMap_js_1.CharacterMap("angchar-symbols", angleChars, {
    degreeminute: ["\u2032", {}],
    degreesecond: ["\u2033", {}],
});
new TokenMap_js_1.CommandMap("siunitxMap", {
    num: ["siunitxToken", "num"],
    ang: ["siunitxToken", "ang"],
    complexnum: ["siunitxToken", "complexnum"],
    unit: ["siunitxToken", "unit"],
    qty: ["siunitxToken", "qty"],
    complexqty: ["siunitxToken", "complexqty"],
    numlist: ["siunitxToken", "numlist"],
    numproduct: ["siunitxToken", "numproduct"],
    numrange: ["siunitxToken", "numrange"],
    qtylist: ["siunitxToken", "qtylist"],
    qtyrange: ["siunitxToken", "qtyrange"],
    qtyproduct: ["siunitxToken", "qtyproduct"],
    DeclareSIUnit: ["siunitxToken", "DeclareSIUnit"],
    sisetup: ["siunitxToken", "sisetup"],
    arialabel: ["Arialabel", "arialabel"],
    data: ["Dataset", "data"],
}, {
    siunitxToken: (parser, name) => {
        var _a;
        if (typeof name === "string")
            (_a = methodMap[name]) === null || _a === void 0 ? void 0 : _a.call(methodMap, parser);
    },
    Arialabel: (parser, name) => {
        if (typeof name === "string") {
            const thelabel = parser.GetArgument(name);
            const arg = (0, aria_label_1.GetArgumentMML)(parser, name);
            NodeUtil_js_1.default.setAttribute(arg, "aria-label", thelabel);
            parser.Push(arg);
        }
    },
    // currently not used
    Dataset: (parser, name) => {
        if (typeof name === "string") {
            const dataset = parser.GetArgument(name);
            const arg = (0, aria_label_1.GetArgumentMML)(parser, name);
            //parse dataset to get both sides of equal
            const pair = dataset.split("=");
            NodeUtil_js_1.default.setAttribute(arg, "data-" + pair[0], pair[1]);
            parser.Push(arg);
        }
    },
});
//TODO: Consider memoization. If input is the same, may as well return the same value without processing.
// Could even split up memoization for \num between parse, post-process, and print.  The options are split
// that way, too, so comparing options should be relatively simple.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config = (_config, jax) => {
    jax.parseOptions.packageData.set("siunitx", {
        [exports.UserDefinedUnitsKey]: new Map(),
        [exports.UserDefinedUnitOptionsKey]: new Map(),
    });
};
Configuration_js_1.Configuration.create("siunitx", {
    handler: {
        macro: ["angchar-symbols", "siunitxMap"],
    },
    options: {
        siunitx: options_1.siunitxDefaults,
    },
    config: config,
});
//# sourceMappingURL=siunitx.js.map

/***/ },

/***/ 376
(__unused_webpack_module, exports) {


// adapted from https://stackoverflow.com/a/21070876/1938624
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TwoWayMap = void 0;
class TwoWayMap {
    constructor(map) {
        this.map = map;
        this.reverseMap = new Map();
        map.forEach((v, k) => {
            // This checks for multiple names for a unit.  Use the first name by default for the reverse lookup.
            if (!this.reverseMap.has(v)) {
                this.reverseMap.set(v, k);
            }
        });
    }
    has(key) { return this.map.has(key); }
    revHas(key) { return this.reverseMap.has(key); }
    get(key) { return this.map.get(key); }
    revGet(key) { return this.reverseMap.get(key); }
    keys() { return this.map.keys(); }
    values() { return this.reverseMap.keys(); }
    forEach(callbackfn) { return this.map.forEach(callbackfn); }
    array() { return [...this.map]; }
    arrayReverse() { return [...this.reverseMap]; }
}
exports.TwoWayMap = TwoWayMap;
//# sourceMappingURL=twoWayMap.js.map

/***/ },

/***/ 249
(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.displayUnits = displayUnits;
exports.parseUnit = parseUnit;
exports.processUnit = processUnit;
const TexError_js_1 = __importDefault(__webpack_require__(446));
const TexParser_js_1 = __importDefault(__webpack_require__(881));
const errors_1 = __webpack_require__(705);
const options_1 = __webpack_require__(878);
const siunitx_1 = __webpack_require__(603);
const units_1 = __webpack_require__(474);
const modifierMacros = new Array('square', 'cubic', 'squared', 'cubed', 'tothe', 'raiseto', 'per', 'of', 'cancel', 'highlight');
function processUnitMacro(macro, parser) {
    macro = macro.substring(1);
    if (modifierMacros.includes(macro)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return modifierMacroMap.get(macro)(macro, parser);
    }
    if (units_1.prefixSymbol.has(macro)) {
        return { type: 'prefix', result: { prefix: units_1.prefixSymbol.get(macro) } };
    }
    const userDefinedUnits = parser.configuration.packageData.get('siunitx')[siunitx_1.UserDefinedUnitsKey];
    if (userDefinedUnits.has('\\' + macro)) {
        const result = userDefinedUnits.get('\\' + macro);
        const userDefinedUnitOptions = parser.configuration.packageData.get('siunitx')[siunitx_1.UserDefinedUnitOptionsKey];
        const options = userDefinedUnitOptions.get('\\' + macro);
        return { type: 'unit', result: { symbol: result, prefix: '' }, options: options };
    }
    if (units_1.unitSymbolsWithShortcuts.has(macro)) {
        const result = units_1.unitSymbolsWithShortcuts.get(macro);
        return { type: 'unit', result: { symbol: result, prefix: '' } };
    }
    throw errors_1.siunitxError.NoInterpretationForUnitMacro('\\' + macro);
}
const modifierMacroMap = new Map([
    ['square', () => { return { type: "next", result: { power: 2 } }; }],
    ['cubic', () => { return { type: "next", result: { power: 3 } }; }],
    ['squared', () => { return { type: "previous", result: { power: 2 } }; }],
    ['cubed', () => { return { type: "previous", result: { power: 3 } }; }],
    ['tothe', (macro, parser) => {
            const arg = parser.GetArgument('tothe', true);
            return { type: "previous", result: { power: +arg } };
        }],
    ['raiseto', (macro, parser) => {
            const arg = parser.GetArgument('raiseto');
            return { type: "next", result: { power: +arg } };
        }],
    ['per', () => { return { type: "next", result: { position: 'denominator' } }; }],
    ['of', (macro, parser) => {
            const arg = parser.GetArgument('of');
            return { type: "previous", result: { qualifier: arg } };
        }],
    ['cancel', () => { return { type: "next", result: { cancel: true } }; }],
    ['highlight', (macro, parser) => {
            const arg = parser.GetArgument('highlight');
            return { type: "next", result: { highlight: arg } };
        }],
]);
const qualiferMethod = new Map([
    ['subscript', (qualifer) => { return '_{' + qualifer + '}'; }],
    ['bracket', (qualifer) => { return '(' + qualifer + ')'; }],
    ['combine', (qualifer) => { return qualifer; }],
    ['phrase', (qualifer, phrase) => { return phrase + qualifer; }],
]);
function unitLatex(unitPiece, options, absPower = false) {
    var _a;
    let unitLatex = '';
    if (unitPiece.cancel) {
        unitLatex += '\\cancel{';
    }
    if (unitPiece.highlight) {
        unitLatex += `{\\color{${unitPiece.highlight}}`;
    }
    unitLatex += options["unit-font-command"] + '{';
    //check for square root
    if (options["power-half-as-sqrt"] && unitPiece.power && unitPiece.power === 0.5) {
        unitLatex += `\\sqrt{\\class{MathML-Unit}{${unitPiece.prefix}${unitPiece.symbol}}}`;
        unitPiece.power = undefined;
    }
    else {
        unitLatex += `\\class{MathML-Unit}{${unitPiece.prefix}${unitPiece.symbol}}`;
    }
    if (unitPiece.qualifier) {
        unitLatex += (_a = qualiferMethod.get(options["qualifier-mode"])) === null || _a === void 0 ? void 0 : _a(unitPiece.qualifier, options["qualifier-phrase"]);
    }
    unitLatex += '}';
    const power = (unitPiece.power !== undefined && unitPiece.power !== null)
        ? (absPower
            ? Math.abs(unitPiece.power * (unitPiece.position === 'denominator' ? -1 : 1))
            : unitPiece.power * (unitPiece.position === 'denominator' ? -1 : 1))
        : (absPower
            ? Math.abs(1 * (unitPiece.position === 'denominator' ? -1 : 1))
            : 1 * (unitPiece.position === 'denominator' ? -1 : 1));
    if (power !== null && power !== undefined && power !== 1) {
        unitLatex += '^{' + power + '}';
    }
    if (unitPiece.cancel) {
        unitLatex += '}';
    }
    if (unitPiece.highlight) {
        unitLatex += '}';
    }
    return { latex: unitLatex, superscriptPresent: power !== 1 };
}
function displayUnits(parser, unitPieces, options, isLiteral) {
    let closeColor = false;
    let texString = '';
    if (options["unit-color"] !== '') {
        texString += `{\\color{${options["unit-color"]}}`;
        closeColor = true;
    }
    else if (options.color !== '') {
        texString += `{\\color{${options.color}}`;
        closeColor = true;
    }
    let perForSingle = false;
    if (unitPieces.length >= 2 && unitPieces.filter((v) => {
        const power = (v.power !== null && v.power !== undefined)
            ? (v.power * (v.position === 'denominator' ? -1 : 1))
            : 1;
        return Math.sign(power) === -1;
    }).length === 1 && options["per-mode"] === 'single-symbol') {
        perForSingle = true;
    }
    if (isLiteral) {
        let latex = '';
        let startsSlash = undefined;
        unitPieces.every(p => {
            if (p.position === 'denominator') {
                startsSlash = p;
                return false;
            }
            else {
                return true;
            }
        });
        unitPieces.forEach((v) => {
            if (v === startsSlash) {
                latex += ' / ';
            }
            const latexResult = unitLatex(v, options);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            if (latex !== '') {
                latex += options["inter-unit-product"];
            }
            latex += latexResult.latex;
        });
        texString += latex;
    }
    else {
        // useful for bracket-unit-denominator with perMode=symbol
        // also useful for perMode=single-symbol
        let numeratorCount = 0;
        let denominatorCount = 0;
        unitPieces.forEach((v) => {
            if (v.position === 'denominator' || (v.power !== null && v.power !== undefined && v.power < 0)) {
                denominatorCount++;
            }
            else {
                numeratorCount++;
            }
        }, 0);
        if (options["per-mode"] === 'fraction' || options["per-mode"] === 'symbol'
            || options["per-mode"] === 'repeated-symbol' || perForSingle || (options["per-mode"] === 'single-symbol' && denominatorCount === 1 && numeratorCount > 0)) {
            let numerator = '';
            let denominator = '';
            let lastNumeratorHadSuperscript = false;
            unitPieces.forEach((v) => {
                let latexResult;
                if (v.position === 'denominator' || (v.power !== null && v.power !== undefined && v.power < 0)) {
                    latexResult = unitLatex(v, options, options["per-mode"] === 'fraction' || options["per-mode"] === 'symbol' || options["per-mode"] === 'repeated-symbol' || options["per-mode"] === "single-symbol" || perForSingle);
                    if (denominator !== '') {
                        if (options["per-mode"] === 'repeated-symbol') {
                            if (latexResult.superscriptPresent) {
                                denominator += options["per-symbol-script-correction"];
                            }
                            denominator += options["per-symbol"];
                        }
                        else {
                            denominator += options["inter-unit-product"];
                        }
                    }
                    denominator += latexResult.latex;
                }
                else {
                    latexResult = unitLatex(v, options, options["per-mode"] === 'fraction' || options["per-mode"] === 'symbol' || options["per-mode"] === 'repeated-symbol' || options["per-mode"] === "single-symbol" || perForSingle);
                    lastNumeratorHadSuperscript = latexResult.superscriptPresent;
                    if (numerator !== '') {
                        numerator += options["inter-unit-product"];
                    }
                    numerator += latexResult.latex;
                }
            });
            // if no numerator, use 1... but use nothing if denominator is empty, too
            if (numerator === '' && denominator !== '') {
                numerator = '1';
            }
            // if no denominator, then no fraction needed.
            if (denominator !== '') {
                //adjust denominator if brackets are needed
                if (denominatorCount > 1 && options["per-mode"] === 'symbol' && options["bracket-unit-denominator"]) {
                    denominator = '(' + denominator + ')';
                }
                if (options["per-mode"] === 'fraction') {
                    texString += options["fraction-command"] + '{' + numerator + '}{' + denominator + '}';
                }
                else if (options["per-mode"] === 'repeated-symbol' || options["per-mode"] === 'symbol' || perForSingle || options["per-mode"] === 'single-symbol') {
                    texString += numerator + (lastNumeratorHadSuperscript ? options["per-symbol-script-correction"] : '') + options["per-symbol"] + denominator;
                }
                else {
                    throw errors_1.siunitxError.DenominatorParsingError(denominator, options["per-mode"]);
                }
            }
            else {
                texString += numerator;
            }
        }
        else {
            if (options["per-mode"] === 'power-positive-first') {
                unitPieces = unitPieces.sort((x, y) => {
                    let a = (x.power !== null && x.power !== undefined) ? x : 1;
                    if (x.position === 'denominator') {
                        a = -a;
                    }
                    let b = (y.power !== null && y.power !== undefined) ? y : 1;
                    if (y.position === 'denominator') {
                        b = -b;
                    }
                    if (a < b)
                        return 1;
                    else if (a > b)
                        return -1;
                    else
                        return 0;
                });
            }
            let latex = '';
            //let lastHadSuperscript = false;
            unitPieces.forEach((v) => {
                const latexResult = unitLatex(v, options);
                //lastHadSuperscript = latexResult.superscriptPresent;
                if (latex !== '') {
                    latex += options["inter-unit-product"];
                }
                latex += latexResult.latex;
            });
            texString += latex;
        }
    }
    if (closeColor) {
        texString += '}';
    }
    return texString;
}
function parseUnit(parser, text, globalOptions, localOptions, isLiteral) {
    const unitPieces = new Array();
    // argument contains either macros or it's just plain text
    if (!isLiteral) {
        const subParser = new TexParser_js_1.default(text, parser.stack.env, parser.configuration);
        subParser.i = 0;
        let nextModifier = null;
        while (subParser.i < subParser.string.length) {
            const macro = subParser.GetArgument('unit');
            const processedMacro = processUnitMacro(macro, subParser);
            // check for user defined options
            if (processedMacro.options !== undefined) {
                Object.assign(globalOptions, processedMacro.options);
            }
            // apply immediate options here
            Object.assign(globalOptions, localOptions);
            switch (processedMacro.type) {
                case 'next':
                case 'prefix':
                    if (nextModifier !== null) {
                        nextModifier = Object.assign(nextModifier, processedMacro.result);
                    }
                    else {
                        nextModifier = processedMacro.result;
                    }
                    break;
                case 'previous':
                    {
                        if (unitPieces.length === 0) {
                            throw new TexError_js_1.default("MissingPreviousMacro", "There is no previous macro for %1 to modify.", macro);
                        }
                        let last = unitPieces[unitPieces.length - 1];
                        last = Object.assign(last, processedMacro.result);
                        break;
                    }
                case 'unit':
                    {
                        if (nextModifier !== null) {
                            processedMacro.result = Object.assign(processedMacro.result, nextModifier);
                            // TODO: WHY IS THIS parser.options and not globaloptions???
                            // Is this even needed?  repeated-symbol is a display option, not a parsing option.
                            if (parser.options.siunitx["per-mode"] === 'repeated-symbol' || globalOptions["sticky-per"]) {
                                const denom = nextModifier.position === 'denominator';
                                nextModifier = null;
                                if (denom) {
                                    nextModifier = { position: 'denominator' };
                                }
                            }
                            else {
                                nextModifier = null;
                            }
                        }
                        unitPieces.push(processedMacro.result);
                        break;
                    }
            }
        }
    }
    else {
        unitPieces.push(...parsePlainTextUnits(parser, text));
    }
    return unitPieces;
}
function processUnit(parser) {
    const globalOptions = Object.assign({}, parser.options.siunitx);
    // TODO: may be better done a different way. double check.
    const localOptions = (0, options_1.findOptions)(parser, globalOptions);
    if ((localOptions["parse-units"] === undefined || localOptions["parse-units"] === true) &&
        globalOptions["parse-units"] === true) {
        const text = parser.GetArgument('unit');
        // There are no switches to change internally that indicates the unit was literal vs interpreted. 
        // If literal, we do NOT apply per-mode settings.
        // We'll check if text had backslashes and pass that result to the next functions.
        const isLiteral = (text.indexOf('\\') === -1);
        // This will only be a global option.  
        if (globalOptions["forbid-literal-units"]) {
            throw errors_1.siunitxError.LiteralUnitsForbidden(text);
        }
        const unitPieces = parseUnit(parser, text, globalOptions, localOptions, isLiteral);
        const texString = displayUnits(parser, unitPieces, globalOptions, isLiteral);
        return (new TexParser_js_1.default(texString, parser.stack.env, parser.configuration)).mml();
    }
    else {
        return parser.mml();
    }
}
function joinValues(values, joinString) {
    return Array.from(values).filter((e, i, a) => i === a.indexOf(e)).sort((a, b) => a.length - b.length).join(joinString);
}
function processPrefixUnitCombo(text, unitPiece) {
    const prefixes = joinValues(units_1.prefixSymbol.values(), '|');
    const units = joinValues(units_1.unitSymbol.values(), '|');
    // TODO: Do I need to sort regex options from long string to short string?  
    // I don't think so since we're parsing a single unit at a time...but I should verify.
    const regex = new RegExp('(' + prefixes + ')?(' + units + ')');
    const result = regex.exec(text);
    if (result === null) {
        return;
    }
    if (result[1] !== undefined && result[1] !== null) {
        unitPiece.prefix = result[1];
    }
    else {
        unitPiece.prefix = '';
    }
    unitPiece.symbol = result[2];
}
function parsePlainTextUnits(parser, text) {
    const unitPieces = new Array();
    const subParser = new TexParser_js_1.default(text, parser.stack.env, parser.configuration);
    subParser.i = 0;
    let unitPiece = { position: 'numerator' };
    let isDenominator = false;
    let prefixUnit = '';
    while (subParser.i < subParser.string.length) {
        switch (subParser.string.charAt(subParser.i)) {
            case '~':
            case '.':
                //process prefix-unit string into unitPiece
                processPrefixUnitCombo(prefixUnit, unitPiece);
                unitPieces.push(unitPiece);
                prefixUnit = '';
                unitPiece = { position: isDenominator ? 'denominator' : 'numerator' };
                break;
            case '/':
                //process prefix-unit string into unitPiece
                processPrefixUnitCombo(prefixUnit, unitPiece);
                unitPieces.push(unitPiece);
                prefixUnit = '';
                isDenominator = true;
                unitPiece = { position: isDenominator ? 'denominator' : 'numerator' };
                break;
            case '^':
                {
                    //power
                    let next = subParser.string.charAt(++subParser.i);
                    let power = '';
                    if (next === '{') {
                        while ((next = subParser.string.charAt(++subParser.i)) !== '}') {
                            power += next;
                        }
                    }
                    else {
                        power = next;
                    }
                    unitPiece.power = +power;
                    break;
                }
            case '_':
                {
                    //of
                    let next = subParser.string.charAt(++subParser.i);
                    let qualifier = '';
                    if (next === '{') {
                        while ((next = subParser.string.charAt(++subParser.i)) !== '}') {
                            qualifier += next;
                        }
                    }
                    else {
                        qualifier = next;
                    }
                    unitPiece.qualifier = qualifier;
                    break;
                }
            default:
                //add char to prefix-unit string
                prefixUnit += subParser.string.charAt(subParser.i);
                break;
        }
        subParser.i++;
        //return parser.string.slice(j, parser.i -1);
    }
    processPrefixUnitCombo(prefixUnit, unitPiece);
    unitPieces.push(unitPiece);
    // throw new TexError('MissingCloseBracket',
    // 'Could not find closing \']\' for argument to %1', parser.currentCS);
    return unitPieces;
}
//# sourceMappingURL=unitMethods.js.map

/***/ },

/***/ 474
(__unused_webpack_module, exports, __webpack_require__) {


Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.unitSymbolsWithShortcuts = exports.unitNameLookup = exports.unitSymbol = exports.binaryPrefixPower = exports.prefixPower = exports.prefixSymbol = void 0;
const twoWayMap_1 = __webpack_require__(376);
exports.prefixSymbol = new Map([
    ['quetta', 'Q'],
    ['ronna', 'R'],
    ['yotta', 'Y'],
    ['zetta', 'Z'],
    ['exa', 'E'],
    ['peta', 'P'],
    ['tera', 'T'],
    ['giga', 'G'],
    ['mega', 'M'],
    ['kilo', 'k'],
    ['hecto', 'h'],
    ['deka', 'da'],
    ['deca', 'da'],
    ['deci', 'd'],
    ['centi', 'c'],
    ['milli', 'm'],
    ['micro', 'µ'],
    ['nano', 'n'],
    ['pico', 'p'],
    ['femto', 'f'],
    ['atto', 'a'],
    ['zepto', 'z'],
    ['yocto', 'y'],
    ['ronto', 'r'],
    ['quecto', 'q'],
    ['kibi', 'Ki'],
    ['mebi', 'Mi'],
    ['gibi', 'Gi'],
    ['tebi', 'Ti'],
    ['pebi', 'Pi'],
    ['exbi', 'Ei'],
    ['zebi', 'Zi'],
    ['yobi', 'Yi'],
]);
exports.prefixPower = new twoWayMap_1.TwoWayMap(new Map([
    ['Q', 30],
    ['R', 27],
    ['Y', 24],
    ['Z', 21],
    ['E', 18],
    ['P', 15],
    ['T', 12],
    ['G', 9],
    ['M', 6],
    ['k', 3],
    ['h', 2],
    ['da', 1],
    ['d', -1],
    ['c', -2],
    ['m', -3],
    ['u', -6],
    ['n', -9],
    ['p', -12],
    ['f', -15],
    ['a', -18],
    ['z', -21],
    ['y', -24],
    ['r', -27],
    ['q', -30]
]));
exports.binaryPrefixPower = new Map([
    ['Ki', 10],
    ['Mi', 20],
    ['Gi', 30],
    ['Ti', 40],
    ['Pi', 50],
    ['Ei', 60],
    ['Zi', 70],
    ['Yi', 80],
]);
// These are separate from the shortcuts so we can parse literal strings that contain units.
exports.unitSymbol = new Map([
    ['meter', 'm'],
    ['metre', 'm'],
    ['gram', 'g'],
    ['second', 's'],
    ['ampere', 'A'],
    ['candela', 'cd'],
    ['kelvin', 'K'],
    ['kilogram', 'kg'],
    ['mole', 'mol'],
    ['becquerel', 'Bq'],
    ['degreeCelsius', '\\degree C'],
    ['coulomb', 'C'],
    ['farad', 'F'],
    ['gray', 'Gy'],
    ['hertz', 'Hz'],
    ['henry', 'H'],
    ['joule', 'J'],
    ['lumen', 'lm'],
    ['katal', 'kat'],
    ['lux', 'lx'],
    ['newton', 'N'],
    ['ohm', '\\ohm'],
    ['pascal', 'Pa'],
    ['radian', 'rad'],
    ['siemens', 'S'],
    ['sievert', 'Sv'],
    ['steradian', 'sr'],
    ['tesla', 'T'],
    ['volt', 'V'],
    ['watt', 'W'],
    ['weber', 'Wb'],
    ['astronomicalunit', 'au'],
    ['bel', 'B'],
    ['dalton', 'Da'],
    ['day', 'd'],
    ['decibel', 'dB'],
    ['degree', '\\degree'],
    ['electronvolt', 'eV'],
    ['hectare', 'ha'],
    ['hour', 'h'],
    ['litre', 'L'],
    ['liter', 'L'],
    ['arcminute', "'"],
    ['minute', 'min'],
    ['arcsecond', "''"],
    ['neper', 'Np'],
    ['tonne', 't'],
    ['percent', '\\%'],
]);
exports.unitNameLookup = new twoWayMap_1.TwoWayMap(exports.unitSymbol);
exports.unitSymbolsWithShortcuts = new Map([
    ...exports.unitSymbol,
    ['fg', 'fg'],
    ['pg', 'pg'],
    ['ng', 'ng'],
    ['ug', '\\micro g'],
    ['mg', 'mg'],
    ['g', 'g'],
    ['kg', 'kg'],
    ['pm', 'pm'],
    ['nm', 'nm'],
    ['um', '\\micro m'],
    ['mm', 'mm'],
    ['cm', 'cm'],
    ['dm', 'dm'],
    ['m', 'm'],
    ['km', 'km'],
    ['as', 'as'],
    ['fs', 'fs'],
    ['ps', 'ps'],
    ['ns', 'ns'],
    ['us', '\\micro s'],
    ['ms', 'ms'],
    ['s', 's'],
    ['fmol', 'fmol'],
    ['pmol', 'pmol'],
    ['nmol', 'nmol'],
    ['umol', '\\micro mol'],
    ['mmol', 'mmol'],
    ['mol', 'mol'],
    ['kmol', 'kmol'],
    ['pA', 'pA'],
    ['nA', 'nA'],
    ['uA', '\\micro A'],
    ['mA', 'mA'],
    ['A', 'A'],
    ['kA', 'kA'],
    ['ul', '\\micro L'],
    ['ml', 'mL'],
    ['l', 'L'],
    ['hl', 'hL'],
    ['uL', '\\micro L'],
    ['mL', 'mL'],
    ['L', 'L'],
    ['hL', 'hL'],
    ['mHz', 'mHz'],
    ['Hz', 'Hz'],
    ['kHz', 'kHz'],
    ['MHz', 'MHz'],
    ['GHz', 'GHz'],
    ['THz', 'THz'],
    ['mN', 'mN'],
    ['N', 'N'],
    ['kN', 'kN'],
    ['MN', 'MN'],
    ['Pa', 'Pa'],
    ['kPa', 'kPa'],
    ['MPa', 'MPa'],
    ['GPa', 'GPa'],
    ['mohm', 'm\\ohm'],
    ['kohm', 'k\\ohm'],
    ['Mohm', 'M\\ohm'],
    ['pV', 'pV'],
    ['nV', 'nV'],
    ['uV', '\\micro V'],
    ['mV', 'mV'],
    ['V', 'V'],
    ['kV', 'kV'],
    ['W', 'W'],
    ['nW', 'nW'],
    ['uW', '\\micro W'],
    ['mW', 'mW'],
    ['kW', 'kW'],
    ['MW', 'MW'],
    ['GW', 'GW'],
    ['J', 'J'],
    ['uJ', '\\micro J'],
    ['mJ', 'mJ'],
    ['kJ', 'kJ'],
    ['eV', 'eV'],
    ['meV', 'meV'],
    ['keV', 'keV'],
    ['MeV', 'MeV'],
    ['GeV', 'GeV'],
    ['TeV', 'TeV'],
    ['kWh', 'kW\\, h'], // possible wrong formatting, need to try using IUnitPiece[]
    ['F', 'F'],
    ['fF', 'fF'],
    ['pF', 'pF'],
    ['nF', 'nF'],
    ['uF', '\\micro F'],
    ['mF', 'mF'],
    ['H', 'H'],
    ['fH', 'fH'],
    ['pH', 'pH'],
    ['nH', 'nH'],
    ['uH', '\\micro H'],
    ['mH', 'mH'],
    ['C', 'C'],
    ['nC', 'nC'],
    ['mC', 'mC'],
    ['uC', '\\micro C'],
    ['T', 'T'],
    ['mT', 'mT'],
    ['uT', '\\micro T'],
    ['K', 'K'],
    ['dB', 'dB'],
    ['bit', 'b'],
    ['byte', 'B'],
    ['%', '\\%'],
]);
//# sourceMappingURL=units.js.map

/***/ },

/***/ 477
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Configuration: () => (/* binding */ Configuration),
/* harmony export */   ConfigurationHandler: () => (/* binding */ ConfigurationHandler),
/* harmony export */   ParserConfiguration: () => (/* binding */ ParserConfiguration)
/* harmony export */ });
const def = MathJax._.input.tex.Configuration;
const Configuration = def.Configuration;
const ConfigurationHandler = def.ConfigurationHandler;
const ParserConfiguration = def.ParserConfiguration;


/***/ },

/***/ 180
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const def = MathJax._.input.tex.NodeUtil;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (def.default);


/***/ },

/***/ 152
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   KeyValueDef: () => (/* binding */ KeyValueDef),
/* harmony export */   KeyValueTypes: () => (/* binding */ KeyValueTypes),
/* harmony export */   ParseUtil: () => (/* binding */ ParseUtil)
/* harmony export */ });
const def = MathJax._.input.tex.ParseUtil;
const KeyValueDef = def.KeyValueDef;
const KeyValueTypes = def.KeyValueTypes;
const ParseUtil = def.ParseUtil;


/***/ },

/***/ 17
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   TexConstant: () => (/* binding */ TexConstant)
/* harmony export */ });
const def = MathJax._.input.tex.TexConstants;
const TexConstant = def.TexConstant;


/***/ },

/***/ 446
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const def = MathJax._.input.tex.TexError;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (def.default);


/***/ },

/***/ 881
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
const def = MathJax._.input.tex.TexParser;
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (def.default);


/***/ },

/***/ 782
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Macro: () => (/* binding */ Macro),
/* harmony export */   Token: () => (/* binding */ Token)
/* harmony export */ });
const def = MathJax._.input.tex.Token;
const Token = def.Token;
const Macro = def.Macro;


/***/ },

/***/ 170
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbstractParseMap: () => (/* binding */ AbstractParseMap),
/* harmony export */   AbstractTokenMap: () => (/* binding */ AbstractTokenMap),
/* harmony export */   CharacterMap: () => (/* binding */ CharacterMap),
/* harmony export */   CommandMap: () => (/* binding */ CommandMap),
/* harmony export */   DelimiterMap: () => (/* binding */ DelimiterMap),
/* harmony export */   EnvironmentMap: () => (/* binding */ EnvironmentMap),
/* harmony export */   MacroMap: () => (/* binding */ MacroMap),
/* harmony export */   RegExpMap: () => (/* binding */ RegExpMap),
/* harmony export */   parseResult: () => (/* binding */ parseResult)
/* harmony export */ });
const def = MathJax._.input.tex.TokenMap;
const parseResult = def.parseResult;
const AbstractTokenMap = def.AbstractTokenMap;
const RegExpMap = def.RegExpMap;
const AbstractParseMap = def.AbstractParseMap;
const CharacterMap = def.CharacterMap;
const DelimiterMap = def.DelimiterMap;
const MacroMap = def.MacroMap;
const CommandMap = def.CommandMap;
const EnvironmentMap = def.EnvironmentMap;


/***/ },

/***/ 74
(module) {

module.exports = /*#__PURE__*/JSON.parse('{"badOptionsChars":"Invalid control sequence at the end of the %1 option.","comparatorAlreadySet":"A comparator has already been set.  %1 is already present, but you\'re trying to add %2.","exponentThresholdsError":"Couldn\'t parse %1.  Option \\"exponent-threshold\\" must be in the form of \\"min-number:max-number\\".","extraSemicolon":"There are two many semi-colons.  Should only be two at most.","invalidAngArgument":"%1 contains invalid characters and cannot be parsed by siunitx for the ang macro.","invalidNumArgument":"%1 contains invalid characters and cannot be parsed by siunitx for the num macro.","invalidOptionValue":"Key %1 accepts only values of type %2.","invalidOptionName":"Option %1 does not exist.","literalUnitsForbidden":"%1 is detected as a literal unit.  These are forbidden globally. Use interpreted units instead (i.e. \\\\kilo\\\\gram).","macroNotDefined":"The unit macro, %1, has not been defined.","noUncertaintyToClose":"Trying to close an uncertainty that doesn\'t exist.","uncertaintyAlreadyClosed":"Uncertainty was already closed.","denominatorParsingError":"Couldn\'t parse %1 using per-mode option of %2."}');

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/* harmony import */ var _js_siunitx_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(603);
/* harmony import */ var _js_siunitx_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_js_siunitx_js__WEBPACK_IMPORTED_MODULE_0__);
 // NOTE magical path for MathJax's build process
/******/ })()
;