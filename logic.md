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

Separate options into global and local options.

### parseUnit method

String provided will either contain a backslash or not.  Assume no backslash means plain text units, but any backslash is all macro-based units.

#### Macro-based units

1. 

