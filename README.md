# siunitx extension for MathJax v3

## Demo

https://limefrogyank.github.io/siunitx-pcc/

## Description

This is a project being funded by Portland Community College to be completed end of summer 2023.  The goal is to make it free and open-source, but licensing is currently pending.  The intent is for it to be used in authoring online, OER (open educational resource), _accessible_ textbooks.

This is a port of (Joseph Wright's siunitx package for LaTeX)[https://github.com/josephwright/siunitx] that will work with the (MathJax)[https://www.mathjax.org/] v3+ extension system.  As a result it is written entirely in TypeScript.  His siunitx pdf documents were used to make this port as close as possible to the original with some caveats: 

* MathJax is math mode only, so features like tables won't work and are not implemented
* The evaluate function is running on a javascript engine instead of the LaTeX compiler so beware the differences

## To Use

**This is not production ready code yet!  Use at your own risk!** Be patient, it should be ready before the end of 2023 after some code review.

This will hopefully be added into the MathJax package.  Until then, you can mimic the [demo page source code](https://github.com/limefrogyank/siunitx-pcc/blob/main/index.html).

1. Add the [siunitx.js](https://github.com/limefrogyank/siunitx-pcc/blob/main/siunitx.js) compiled file to your web page in any directory.

2. To any page that needs MathJax with **siunitx**, add a named path in the config file for MathJax in the `paths` object which is in the `loader` object.  If siunitx.js is in the same directory, you can use `.`, otherwise use a relative path.  (i.e. `./somefolder`,  `../folderbehindpagefolder`, etc.)  This example uses the name "custom" for the named path, but you can use any name for it.

```javascript
MathJax = {
    loader: {
        paths: {
            custom: '.'
        }
    }
};
```

3. Then be sure to then load the extension by adding it to the `load` array under the `loader` object.  Since we used the name "custom" for our named path, we'll prefix the siunitx.js filename with the path in brackets.

```javascript
MathJax = {
    loader: {
        load: ['[custom]/siunitx.js'],
        paths: {
            custom: '.'
        }
    }
};
```

4.  Add all of the other extensions you will need.  The siunitx package requires several extra extensions, some are required, others are optional.
* html: required - adds MathML-Unit class for speech-rule-engine
* gensymb: optional - needed for the degree symbol and ohm symbol
* color: optional - needed for color
* cancel: optional - needed for canceled units (diagonal line through unit)

These can be loaded similarly to how siunitx.js is loaded.

```javascript
MathJax = {
    loader: {
        load: ['[custom]/siunitx.js', '[tex]/gensymb', '[tex]/color', '[tex]/html', '[tex]/cancel'],
        paths: {
            custom: '.'
        }
    }
}
```

5.  *Activate* these extensions within the `tex` object of the configuration.  This tells MathJax to use these extensions when reading TeX type input.

```javascript
MathJax = {
    loader: {
        load: ['[custom]/siunitx.js', '[tex]/gensymb', '[tex]/color', '[tex]/html', '[tex]/cancel'],
        paths: {
            custom: '.'
        }
    },
    tex: {
        packages: {
            '[+]': ['siunitx', 'gensymb', 'color', 'html', 'cancel']
        },
    }
}
```

6. **Optional** but highly recommended:  Tell MathJax to use ClearSpeak instead of MathSpeak for accessibility.  ClearSpeak sounds more natural when reading plain numbers and units.  This is done via the options object of the MathJax configuration.  This won't add any overhead to the page loading until the viewer activates Accessibility features through the right-click menu.  

```javascript
MathJax = {
    loader: {
        load: ['[custom]/siunitx.js', '[tex]/gensymb', '[tex]/color', '[tex]/html', '[tex]/cancel'],
        paths: {
            custom: '.'
        }
    },
    tex: {
        packages: {
            '[+]': ['siunitx', 'gensymb', 'color', 'html', 'cancel']
        },
    },
    options: {
        enableEnrichment: true,
        sre: {
            domain: 'clearspeak'
        }
    }
}
```

7. **Optional** One method of add global parameters to the siunitx formatting is to add them to the MathJax configuration file.  For example, if you wanted all fractions on that page to display as numerator over denominator (instead of inline with a slash character), you would use the `per-mode = fraction` setting.  You can add this directly to the tex object in the configuration.  You must convert the property name dash-case to camelCase (remove dashes and capitalize the first letter after each dash, i.e. `list-pair-separator` becomes `listPairSeparator` ).

```javascript
MathJax = {
    loader: {
        load: ['[custom]/siunitx.js', '[tex]/gensymb', '[tex]/color', '[tex]/html', '[tex]/cancel'],
        paths: {
            custom: '.'
        }
    },
    tex: {
        packages: {
            '[+]': ['siunitx', 'gensymb', 'color', 'html', 'cancel']
        },
        perMode: 'fraction'
    },
    options: {
        enableEnrichment: true,
        sre: {
            domain: 'clearspeak'
        }
    }
}
```

Of course, you're not required to put global options in the MathJax configuration file!  You may not even have access to this portion of the page.  

You're also allowed to use `\\sisetup` within the page to do the same thing.  Notice, we're using dash-case when using TeX markup.  

```tex
\sisetup{per-mode = fraction}
```

This line before you add anything else will do the same thing as the property in the configuration.

## To Build Yourself

Clone the repo, make sure you have nodejs, then `npm run build` .  This will generate the 'siunitx.js' file that's already in the root folder.
