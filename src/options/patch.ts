import TexError from 'mathjax-full/js/input/tex/TexError';
import { EnvList } from 'mathjax-full/js/input/tex/StackItem';
import TexParser from 'mathjax-full/js/input/tex/TexParser';
import ParseUtil from 'mathjax-full/js/input/tex/ParseUtil';




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
ParseUtil.keyvalOptions = function (
  attrib: string,
  allowed: { [key: string]: number } = null,
  error: boolean = false,
  l3keys: boolean = false
): EnvList {
  const def: EnvList = readKeyval(attrib, l3keys);
  if (allowed) {
    for (const key of Object.keys(def)) {
      // eslint-disable-next-line no-prototype-builtins
      if (!allowed.hasOwnProperty(key)) {
        if (error) {
          throw new TexError('InvalidOption', 'Invalid option: %1', key);
        }
        delete def[key];
      }
    }
  }
  return def;
}


/**
 * Implementation of the keyval function from https://www.ctan.org/pkg/keyval
 * @param {string} text The optional parameter string for a package or
 *     command.
 * @param {boolean?} l3keys If true, use l3key-style parsing (only remove one set of braces)
 * @return {EnvList} Set of options as key/value pairs.
 */
function readKeyval(text: string, l3keys: boolean = false): EnvList {
  const options: EnvList = {};
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
    } else if (key) {
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
function removeBraces(text: string, count: number): string {
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
function readValue(
  text: string,
  end: string[],
  l3keys: boolean = false,
  dropBrace: boolean = false
): [string, string, string] {
  const length = text.length;
  let braces = 0;
  let value = '';
  let index = 0;
  let start = 0;             // Counter for the starting left braces.
  let countBraces = true;     // Flag for counting starting left braces.
  // after starting braces, but no other char yet.
  while (index < length) {
    const c = text[index++];
    switch (c) {
      case '\\':               // Handle control sequences (in particular, \{ and \})
        value += c + (text[index++] || '');
        countBraces = false;
        continue;
      case ' ':                // Ignore spaces.
        break;
      case '{':
        if (countBraces) {      // Count open left braces at start.
          start++;
        }
        braces++;
        break;
      case '}':
        if (!braces) {          // Closing braces.
          throw new TexError('ExtraCloseMissingOpen', 'Extra close brace or missing open brace');
        }
        braces--;
        countBraces = false;    // Stop counting start left braces.
        break;
      default:
        if (!braces && end.indexOf(c) !== -1) {   // End character reached.
          return [removeBraces(value, l3keys ? Math.min(1, start) : start), c, text.slice(index)];
        }
        if (start > braces) {   // Some start left braces have been closed.
          start = braces;
        }
        countBraces = false;
    }
    value += c;
  }
  if (braces) {
    throw new TexError('ExtraOpenMissingClose', 'Extra open brace or missing close brace');
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
TexParser.prototype.GetBrackets = function (_name: string, def?: string, matchBrackets: boolean = false): string {
  if (this.GetNext() !== '[') {
    return def;
  }
  // eslint-disable-next-line prefer-const
  let j = ++this.i, braces = 0, brackets = 0;
  while (this.i < this.string.length) {
    switch (this.string.charAt(this.i++)) {
      case '{': braces++; break;
      case '\\': this.i++; break;
      case '}':
        if (braces-- <= 0) {
          throw new TexError('ExtraCloseLooking',
            'Extra close brace while looking for %1', '\']\'');
        }
        break;
      case '[': if (braces === 0) brackets++; break;
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
  throw new TexError('MissingCloseBracket',
    'Could not find closing \']\' for argument to %1', this.currentCS);
}
