/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Testing various project search features

"use strict";

requestLongerTimeout(3);

add_task(async function testProjectSearchCloseOnNavigation() {
  const dbg = await initDebugger(
    "doc-script-switching.html",
    "script-switching-01.js"
  );

  await selectSource(dbg, "script-switching-01.js");

  await openProjectSearch(dbg);
  await doProjectSearch(dbg, "first");

  is(dbg.selectors.getActiveSearch(), "project");

  await navigate(dbg, "doc-scripts.html");

  // wait for the project search to close
  await waitForState(dbg, state => !dbg.selectors.getActiveSearch());
});

add_task(async function testSimpleProjectSearch() {
  const dbg = await initDebugger(
    "doc-script-switching.html",
    "script-switching-01.js"
  );

  await openProjectSearch(dbg);
  const searchTerm = "first";
  await doProjectSearch(dbg, searchTerm);

  const queryMatch = findElement(dbg, "fileMatch").querySelector(
    ".query-match"
  );
  is(
    queryMatch.innerText,
    searchTerm,
    "The highlighted text matches the search term"
  );

  info("Select a result match to open the location in the source");
  await clickElement(dbg, "fileMatch");
  await waitForSelectedSource(dbg, "script-switching-01.js");
});

add_task(async function testMatchesForRegexSearches() {
  const dbg = await initDebugger("doc-react.html", "App.js");
  await openProjectSearch(dbg);

  type(dbg, "import .* from 'react'");
  await clickElement(dbg, "projectSearchModifiersRegexMatch");

  await waitForSearchResults(dbg, 2);

  const queryMatch = findAllElements(dbg, "fileMatch")[1].querySelector(
    ".query-match"
  );

  is(
    queryMatch.innerText,
    "import React, { Component } from 'react'",
    "The highlighted text matches the search term"
  );

  // Turn off the regex modifier so does not break tests below
  await clickElement(dbg, "projectSearchModifiersRegexMatch");
});

// Test expanding search results to reveal the search matches.
add_task(async function testExpandSearchResultsToShowMatches() {
  const dbg = await initDebugger("doc-react.html", "App.js");

  await openProjectSearch(dbg);
  await doProjectSearch(dbg, "we");

  is(getExpandedResultsCount(dbg), 159);

  const collapsedNodes = findAllElements(dbg, "projectSearchCollapsed");
  is(collapsedNodes.length, 1);

  collapsedNodes[0].click();

  is(getExpandedResultsCount(dbg), 367);
});

add_task(async function testSearchModifiers() {
  const dbg = await initDebugger("doc-react.html", "App.js");

  await openProjectSearch(dbg);

  await assertProjectSearchModifier(
    dbg,
    "projectSearchModifiersCaseSensitive",
    "FIELDS",
    "case sensitive",
    { resultWithModifierOn: 0, resultWithModifierOff: 2 }
  );
  await assertProjectSearchModifier(
    dbg,
    "projectSearchModifiersRegexMatch",
    `\\*`,
    "regex match",
    { resultWithModifierOn: 12, resultWithModifierOff: 0 }
  );
  await assertProjectSearchModifier(
    dbg,
    "projectSearchModifiersWholeWordMatch",
    "so",
    "whole word match",
    { resultWithModifierOn: 6, resultWithModifierOff: 16 }
  );
});

add_task(async function testSearchExcludePatterns() {
  const dbg = await initDebugger("doc-react.html", "App.js");

  info("Search across all files");
  await openProjectSearch(dbg);
  let fileResults = await doProjectSearch(dbg, "console");

  is(fileResults.length, 5, "5 results were found");

  let resultsFromNodeModules = [...fileResults].filter(result =>
    result.innerText.includes("node_modules")
  );

  is(
    resultsFromNodeModules.length,
    3,
    "3 results were found from node_modules"
  );

  info("Excludes search results based on multiple search patterns");

  await clickElement(dbg, "excludePatternsInput");
  type(dbg, "App.js, main.js");
  pressKey(dbg, "Enter");

  fileResults = await waitForSearchResults(dbg, 3);

  const resultsFromAppJS = [...fileResults].filter(result =>
    result.innerText.includes("App.js")
  );

  is(resultsFromAppJS.length, 0, "None of the results is from the App.js file");

  const resultsFromMainJS = [...fileResults].filter(result =>
    result.innerText.includes("main.js")
  );

  is(
    resultsFromMainJS.length,
    0,
    "None of the results is from the main.js file"
  );

  info("Excludes search results from node modules files");

  await clearElement(dbg, "excludePatternsInput");
  type(dbg, "**/node_modules/**");
  pressKey(dbg, "Enter");

  fileResults = await waitForSearchResults(dbg, 2);

  resultsFromNodeModules = [...fileResults].filter(result =>
    result.innerText.includes("node_modules")
  );

  is(
    resultsFromNodeModules.length,
    0,
    "None of the results is from the node modules files"
  );

  info("Assert that the exclude pattern is persisted across reloads");
  await reloadBrowser();
  await openProjectSearch(dbg);

  const excludePatternsInputElement = await waitForElement(
    dbg,
    "excludePatternsInput"
  );

  is(
    excludePatternsInputElement.value,
    "**/node_modules/**",
    "The exclude pattern for node modules is persisted accross reloads"
  );

  // Clear the fields so that it does not impact on the subsequent tests
  await clearElement(dbg, "projectSearchSearchInput");
  await clearElement(dbg, "excludePatternsInput");
  pressKey(dbg, "Enter");
});

async function assertProjectSearchModifier(
  dbg,
  searchModifierBtn,
  searchTerm,
  title,
  expected
) {
  info(`Assert ${title} search modifier`);

  type(dbg, searchTerm);
  info(`Turn on the ${title} search modifier option`);
  await clickElement(dbg, searchModifierBtn);
  let results = await waitForSearchResults(dbg, expected.resultWithModifierOn);
  is(
    results.length,
    expected.resultWithModifierOn,
    `${results.length} results where found`
  );

  info(`Turn off the ${title} search modifier`);
  await clickElement(dbg, searchModifierBtn);

  results = await waitForSearchResults(dbg, expected.resultWithModifierOff);
  is(
    results.length,
    expected.resultWithModifierOff,
    `${results.length} results where found`
  );
  await clearElement(dbg, "projectSearchSearchInput");
}
