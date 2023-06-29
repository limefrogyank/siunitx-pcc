# First step

`TexParser` finds the siunitx token and maps to the correct token parser (i.e. num, ang, unit, qty, DeclareSIUnit)

DeclareSIUnit is special and has its own starting logic because we want to override the options parsing (stuff in square brackets []).  The bracketed option is passed as a string to the DeclareSIUnit parser method, instead of a dictionary (which won't work).
 
## \ang
1. 