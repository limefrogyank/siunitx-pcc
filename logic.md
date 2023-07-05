# Initialization

`TexParser` finds the siunitx token and maps to the correct token parser (i.e. num, ang, unit, qty, DeclareSIUnit)

DeclareSIUnit is special and has its own starting logic because we want to override the options parsing (stuff in square brackets []).  The bracketed option is passed as a string to the DeclareSIUnit parser method, instead of a dictionary (which won't work).
 
## \num methods

### parseNumber

1. Generate map from defaults that matches single characters OR tokens (text preceeded by a backslash).  The map will resolve to a function to process that character or token OR map to another map.  A second map is needed for tokens with more than one meaning. (i.e. \pm -> sign AND uncertainty )

2. Replace simple math signs with latex equivalents.

3. Generate INumPiece which has empty properties for all of the parts of a number.  Start parsing content of `\num` inside curly braces.  Pass results to previously discussed map.  

    - Map:  If whole and decimal part are still empty, interpret char as `inputSigns` by default.  Else, interpret char as `inputUncertaintySigns` by default 
    - Function:  Just run the function on the char/token

4. Depending on current position in number and options:
    - drop decimal portion
    - drop explicit plus signs
    - drop negative for zero values
    - drop uncertainty if zero

5. Return `INumPiece`.

### postProcessNumber

1. Check for dropping uncertainty and dropping exponent options.

2. Do rounding... also process if rounding makes it zero.
    - None
    - Round places
        - ignore if uncertainty exists
        - round up/down
        - pad right with zeros (optional)
    - Round figures
    - Round uncertainty

3. Check for zero decimal options, pad left with zeros, pad right with zeros

4. Process exponents
    - input: leave as-is
    - fixed: convert entire number to a fixed exponent
    - engineering: convert entire number to engineering mode
    - scientific: convert entire number to scientific mode

5. Remove explicit + sign in exponents.  *** NO OPTION???

6. Return `INumPiece`.

### displayNumber

1. Display prefix (<, >, etc)

2. Group number in sets with subtle spacing.  Options include whole part, decimal part, both, and none as well as quantity to group (3 or 4 at a time).

3. Check options to add color to negative values OR bracket negative values (and remove signs). For brackets, we only add the *leading* bracket here.

4. Check options to display exponential numbers that are 1 or 0. ***

5. Check options to display uncertainties
    - seperate: plus/minus uncertainty
    - compact: uncertainty in bracket at end **
    - full: uncertainty in bracket at end **
    - compact-marker: uncertainty in bracket at end **

6. Check options to display exponents that are zero.  Check options to print a 1 with exponents.

7. Check options to add color to negative values OR bracket negative values (and remove signs). For brackets, we only add the *trailing* bracket here.

8. Return LaTeX output.



## \ang methods

Very similar to `\num` with a few additions.

1. Generate `IAnglePiece` which is three `INumPiece` for degrees, minutes, seconds.  Assume last two are empty for now.

2. Generate same number mapping as in `\num`.

3. Parse angles into each piece using number mapping.

4. Postprocess angle in `IAnglePiece` into desired format:
    - input: same as input
    - arc: convert if needed to arc format (degrees,minutes,seconds)
    - decimal: convert if needed to decimal mode

5. Convert `IAnglePiece` to LaTeX string and check options to include:
    - show degree symbol above decimal marker
    - degree, minutes, seconds separator
    - add minutes and seconds explicitly if zero


## \unit methods

### Initialization

Separate options into global and local options.  This is necessary because the `/unit` macro can contain sub-macros.  These can have their own options.  We need a copy of the local options applied to `/unit` so that if a sub-macro has its own options, we can revert to the original local options after processing that sub-macro.

### parseUnit method

Units are parsed into an array of `IUnitPiece`.  These contain 

String provided will either contain a backslash or not.  Assume no backslash means plain text units, but any backslash is all macro-based units.

#### Macro-based units

Macro unit is parsed into `IUnitMacroProcessResult` using the following flow:

1. Is it a macro modifier? (contained in `modifierMacroMap`)  ex. 'square', 'cubic', 'tothe`, 'per', 'of', 'highlight', 'cancel', etc...
    - Return `next` or `previous` type `IUnitMacroProcessResult` based on which part the modifier affects.
2. Is it a prefix? (contained in `prefixSymbol` map) ex. 'deci', 'centi', 'kilo', etc...
    - Return `prefix` type `IUnitMacroProcessResult`.
3. Is it a user-defined unit?
    - Return `unit` type `IUnitMacroProcessResult`.
4. Is it a package-defined unit symbol?  ex. 'meter', 'metre', hertz', 'ng', 'umol', 'mA', etc...
    - Return `unit` type `IUnitMacroProcessResult`.
5. Error
    - Return `new TexError('102', 'The unit macro, ' + macro + ', has not been defined.')`

Any macro options are applied to the local and global options at this point.

The `IUnitMacroProcessResult` is processed:
- `next` and `prefix` types are stored into a `nextModifier` varible for the next macro.
- `previous` type pulls the last `IUnitPiece` from the array and copies properties over. 
- `unit` type:
    1. Check for `nextModifer` and apply it to the internal `IUnitPiece` from the current result.
        - check `perMode` options to see if **next** unit should continue to be in the denominator if this one is in the denominator.
    2. Add internal `IUnitPiece` to array

#### Plain-text units

Create yet another `TeXParser` to parse the string.  Assume unit starts in the numerator.  Each string-based unit will be placed into `prefixUnit` unless control characters are hit:  `~` `.` `/` `^` `_`

When a control character or end-of-string is reached, a regex is applied to `prefixUnit` to create an `IUnitPiece`.  This `IUnitPiece` is then modified based on which control character triggered the regex.  

`RegExp('(' + prefixes + ')?(' + units + ')')`

(prefixes example: 'E|P|k|d|c|...')
(units example: 'Hz|m|g|N|...')


### displayUnits method

Output LaTeX string from `IUnitPiece` array.



