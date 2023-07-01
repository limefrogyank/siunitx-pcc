# First step

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

