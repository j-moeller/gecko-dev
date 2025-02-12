/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const languagePairs = [
  { fromLang: "es", toLang: "en" },
  { fromLang: "en", toLang: "es" },
  { fromLang: "fr", toLang: "en" },
  { fromLang: "en", toLang: "fr" },
];

const spanishPageUrl = TRANSLATIONS_TESTER_ES;
const englishPageUrl = TRANSLATIONS_TESTER_EN;

/**
 * Test that the translations button is correctly visible when navigating between pages.
 */
add_task(async function test_button_visible_navigation() {
  info("Start at a page in Spanish.");
  const { cleanup } = await loadTestPage({
    page: spanishPageUrl,
    languagePairs,
  });

  await assertTranslationsButton(
    button => !button.hidden,
    "The button should be visible since the page can be translated from Spanish."
  );

  navigate(englishPageUrl, "Navigate to an English page.");

  await assertTranslationsButton(
    button => button.hidden,
    "The button should be invisible since the page is in English."
  );

  navigate(spanishPageUrl, "Navigate back to a Spanish page.");

  await assertTranslationsButton(
    button => !button.hidden,
    "The button should be visible again since the page is in Spanish."
  );

  await cleanup();
});

/**
 * Test that the translations button is correctly visible when opening and switch tabs.
 */
add_task(async function test_button_visible() {
  info("Start at a page in Spanish.");

  const { cleanup, tab: spanishTab } = await loadTestPage({
    page: spanishPageUrl,
    languagePairs,
  });

  await assertTranslationsButton(
    button => !button.hidden,
    "The button should be visible since the page can be translated from Spanish."
  );

  const { removeTab, tab: englishTab } = await addTab(
    englishPageUrl,
    "Creating a new tab for a page in English."
  );

  await assertTranslationsButton(
    button => button.hidden,
    "The button should be invisible since the tab is in English."
  );

  await switchTab(spanishTab);

  await assertTranslationsButton(
    button => !button.hidden,
    "The button should be visible again since the page is in Spanish."
  );

  await switchTab(englishTab);

  await assertTranslationsButton(
    button => button.hidden,
    "Don't show for english pages"
  );

  await removeTab();
  await cleanup();
});

/**
 * Tests a basic panel open, and translation.
 */
add_task(async function test_translations_panel() {
  const { cleanup, runInPage } = await loadTestPage({
    page: spanishPageUrl,
    languagePairs,
  });

  const button = await assertTranslationsButton(
    b => !b.hidden,
    "The button is available."
  );

  await runInPage(async TranslationsTest => {
    const { getH1 } = TranslationsTest.getSelectors();
    await TranslationsTest.assertTranslationResult(
      "The page's H1 is in Spanish.",
      getH1,
      "Don Quijote de La Mancha"
    );
  });

  {
    const popupshown = waitForTranslationsPopupEvent("popupshown");
    click(button, "Opening the popup");
    await popupshown;
  }

  {
    const translateButton = getByL10nId(
      "translations-panel-dual-translate-button"
    );

    const popuphidden = waitForTranslationsPopupEvent("popuphidden");
    click(
      translateButton,
      "Start translating by clicking the translate button."
    );
    await popuphidden;
  }

  await runInPage(async TranslationsTest => {
    const { getH1 } = TranslationsTest.getSelectors();
    await TranslationsTest.assertTranslationResult(
      "The pages H1 is translated.",
      getH1,
      "DON QUIJOTE DE LA MANCHA [es to en, html]"
    );
  });

  {
    const popupshown = waitForTranslationsPopupEvent("popupshown");
    click(button, "Re-opening the popup");
    await popupshown;
  }

  {
    const restoreButton = getByL10nId("translations-panel-restore-button");
    const popuphidden = waitForTranslationsPopupEvent("popuphidden");
    click(restoreButton, "Start translating by clicking the translate button.");
    await popuphidden;
  }

  await runInPage(async TranslationsTest => {
    const { getH1 } = TranslationsTest.getSelectors();
    await TranslationsTest.assertTranslationResult(
      "The page's H1 is restored to Spanish.",
      getH1,
      "Don Quijote de La Mancha"
    );
  });

  await cleanup();
});

/**
 * Tests a basic panel open, and translation.
 */
add_task(async function test_translations_panel_switch_language() {
  const { cleanup, runInPage } = await loadTestPage({
    page: spanishPageUrl,
    languagePairs,
  });

  const button = await assertTranslationsButton(
    b => !b.hidden,
    "The button is available."
  );

  await runInPage(async TranslationsTest => {
    const { getH1 } = TranslationsTest.getSelectors();
    await TranslationsTest.assertTranslationResult(
      "The page's H1 is in Spanish.",
      getH1,
      "Don Quijote de La Mancha"
    );
  });

  {
    const popupshown = waitForTranslationsPopupEvent("popupshown");
    click(button, "Opening the popup");
    await popupshown;
  }

  const fromSelect = document.getElementById("translations-panel-from");
  fromSelect.value = "en";
  fromSelect.dispatchEvent(new Event("input"));

  const toSelect = document.getElementById("translations-panel-to");
  toSelect.value = "fr";
  toSelect.dispatchEvent(new Event("input"));

  {
    const translateButton = getByL10nId(
      "translations-panel-dual-translate-button"
    );

    const popuphidden = waitForTranslationsPopupEvent("popuphidden");
    click(
      translateButton,
      "Start translating by clicking the translate button."
    );
    await popuphidden;
  }

  await runInPage(async TranslationsTest => {
    const { getH1 } = TranslationsTest.getSelectors();
    await TranslationsTest.assertTranslationResult(
      "The pages H1 is translated using the changed languages.",
      getH1,
      "DON QUIJOTE DE LA MANCHA [en to fr, html]"
    );
  });

  await cleanup();
});
