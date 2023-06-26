# siunitx extension for MathJax v3

## Demo
https://limefrogyank.github.io/siunitx/

## Scope
what we want (because some siunitx features are not appropriate for MathJax)

### Tier 1
- `\num`, `\ang`, `\unit`, `\qty`
- the unit and prefix macros (tables 1–4 in the current documentation)
- `\DeclareSIUnit`  (which maybe comes anyway before the unit macros)
- the controls for number formatting (eg 200, 2.0x10² etc)
- the controls for unit formatting (eg m/s versus m s⁻¹)
- control over what goes on between a number and a unit (space, dot, etc)
- going beyond the LaTeX package, having good SRE output for all of this

### Tier 2
- `\DeclareSIQualifier` (eg g_{salt} for "grams of salt")
- `\DeclareSIPower` (eg \square,\cubic,\squared,\cubed)
- ranges, products, and lists
- the number parsing features
