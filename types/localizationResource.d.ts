interface LocalizationResource {
    badOptionChars: string;
    comparatorAlreadySet: string;
    exponentThresholdsError: string;
    extraSemicolon: string;
    invalidAngArgument: string;
    invalidNumArgument: string;
    invalidOptionValue: string;
    literalUnitsForbidden: string;
    macroNotDefined: string;
    noUncertaintyToClose: string;
    uncertaintyAlreadyClosed: string;
}

declare module "src/error/resource.*.json" {
    const val: LocalizationResource;
    export = val;
}