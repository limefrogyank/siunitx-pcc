interface LocalizationResource {
    extraSemicolon: string;
    macroNotDefined: string;
    literalUnitsForbidden: string;
    exponentThresholdsError: string;
}

declare module "resource.*.json" {
    const val: LocalizationResource;
    export = val;
}