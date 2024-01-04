interface LocalizationResource {
    invalidNumArgument: string;
    comparatorAlreadySet: string;
    extraSemicolon: string;
    macroNotDefined: string;
    literalUnitsForbidden: string;
    exponentThresholdsError: string;
}

declare module "src/error/resource.*.json" {
    const val: LocalizationResource;
    export = val;
}