/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests the Javascript Tracing feature.

"use strict";

add_task(async function() {
  // This is preffed off for now, so ensure turning it on
  await pushPref("devtools.debugger.features.javascript-tracing", true);

  const dbg = await initDebugger("doc-scripts.html");

  info("Enable the tracing");
  await clickElement(dbg, "trace");

  const topLevelThread =
    dbg.toolbox.commands.targetCommand.targetFront.threadFront.actorID;
  info("Wait for tracing to be enabled");
  await waitForState(dbg, state => {
    return dbg.selectors.getIsThreadCurrentlyTracing(topLevelThread);
  });

  ok(
    dbg.toolbox.splitConsole,
    "Split console is automatically opened when tracing to the console"
  );

  invokeInTab("main");

  info("Wait for console messages for the whole trace");
  // `main` calls `foo` which calls `bar`
  await hasConsoleMessage(dbg, "λ main");
  await hasConsoleMessage(dbg, "λ foo");
  await hasConsoleMessage(dbg, "λ bar");

  const traceMessages = await findConsoleMessages(dbg.toolbox, "λ main");
  is(traceMessages.length, 1, "We got a unique trace for 'main' function call");
  const sourceLink = traceMessages[0].querySelector(".frame-link-source");
  sourceLink.click();
  info("Wait for the main function to be highlighted in the debugger");
  await waitForSelectedSource(dbg, "simple1.js");
  await waitForSelectedLocation(dbg, 1, 16);

  info("Disable the tracing");
  await clickElement(dbg, "trace");
  info("Wait for tracing to be disabled");
  await waitForState(dbg, state => {
    return !dbg.selectors.getIsThreadCurrentlyTracing(topLevelThread);
  });

  invokeInTab("inline_script2");

  // Let some time for the tracer to appear if we failed disabling the tracing
  await wait(1000);

  const messages = await findConsoleMessages(dbg.toolbox, "inline_script2");
  is(
    messages.length,
    0,
    "We stopped recording traces, an the function call isn't logged in the console"
  );
});

add_task(async function testPersitentLogMethod() {
  let dbg = await initDebugger("doc-scripts.html");
  is(
    dbg.selectors.getJavascriptTracingLogMethod(),
    "console",
    "By default traces are logged to the console"
  );

  info("Change the log method to stdout");
  dbg.actions.setJavascriptTracingLogMethod("stdout");

  await dbg.toolbox.closeToolbox();

  dbg = await initDebugger("doc-scripts.html");
  is(
    dbg.selectors.getJavascriptTracingLogMethod(),
    "stdout",
    "The new setting has been persisted"
  );

  info("Reset back to the default value");
  dbg.actions.setJavascriptTracingLogMethod("console");
});

add_task(async function testPageKeyShortcut() {
  // Ensures that the key shortcut emitted in the content process bubbles up to the parent process
  await pushPref("test.events.async.enabled", true);

  // Fake DevTools being opened by a real user interaction.
  // Tests are bypassing DevToolsStartup to open the tools by calling gDevTools directly.
  // By doing so DevToolsStartup considers itself as uninitialized,
  // whereas we want it to handle the key shortcut we trigger in this test.
  const DevToolsStartup = Cc["@mozilla.org/devtools/startup-clh;1"].getService(
    Ci.nsISupports
  ).wrappedJSObject;
  DevToolsStartup.initialized = true;
  registerCleanupFunction(() => {
    DevToolsStartup.initialized = false;
  });

  const dbg = await initDebugger("data:text/html,key-shortcut");

  const topLevelThread =
    dbg.toolbox.commands.targetCommand.targetFront.threadFront.actorID;
  ok(
    !dbg.selectors.getIsThreadCurrentlyTracing(topLevelThread),
    "Tracing is disabled on debugger opening"
  );

  info(
    "Focus the page in order to assert that the page keeps the focus when enabling the tracer"
  );
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function() {
    content.focus();
  });
  await waitFor(
    () => Services.focus.focusedElement == gBrowser.selectedBrowser
  );
  is(
    Services.focus.focusedElement,
    gBrowser.selectedBrowser,
    "The tab is still focused before enabling tracing"
  );

  info("Toggle ON the tracing via the key shortcut from the web page");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function() {
    EventUtils.synthesizeKey(
      "VK_5",
      { ctrlKey: true, shiftKey: true },
      content
    );
  });

  info("Wait for tracing to be enabled");
  await waitForState(dbg, state => {
    return dbg.selectors.getIsThreadCurrentlyTracing(topLevelThread);
  });

  is(
    Services.focus.focusedElement,
    gBrowser.selectedBrowser,
    "The tab is still focused after enabling tracing"
  );

  info("Toggle it back off, wit the same shortcut");
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function() {
    EventUtils.synthesizeKey(
      "VK_5",
      { ctrlKey: true, shiftKey: true },
      content
    );
  });

  info("Wait for tracing to be disabled");
  await waitForState(dbg, state => {
    return !dbg.selectors.getIsThreadCurrentlyTracing(topLevelThread);
  });
});
