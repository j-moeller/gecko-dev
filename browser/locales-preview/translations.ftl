# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# The button for "Firefox Translations" in the url bar.
urlbar-translations-button =
    .tooltiptext = { -translations-brand-name }

## The translation panel appears from the url bar, and this view is the "dual" translate
## view that lets you choose a source language and target language for translation

translations-panel-dual-header = Translate this page?
translations-panel-dual-from-label = Choose the current page language
translations-panel-dual-to-label = Choose the language to translate into
translations-panel-dual-translate-button = Translate

## The translation panel appears from the url bar, and this view is the "restore" view
## that lets a user restore a page to the original language.

translations-panel-restore-header = Change the language?
# $fromLanguage (string) - The original language of the document.
# $toLanguage (string) - The target language of the translation.
translations-panel-restore-label = The page is being translated from { $fromLanguage } to { $toLanguage }.
translations-panel-restore-button = Restore the page
