// ==UserScript==
// @name         linkedin.com: Up Arrow Edits Last Message
// @namespace    DanKaplanSES
// @version      0.7.4
// @description  In a LinkedIn chat, pressing Up in an empty composer/message box opens your last sent message for editing.
// @match        *://www.linkedin.com/*
// @license      GPL-2.0-or-later
// @supportURL   https://github.com/DanKaplanSES/userscripts/issues
// @homepageURL  https://SleepEasySoftware.com
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @noframes
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Customize: if Up says "Your last message can't be edited" on a message you
  // sent within the last hour, add the word your LinkedIn shows for "Edit" in a
  // message's "..." menu to this list.
  //
  // Menu items have no attribute that identifies them, only their visible label.
  // "Edit" is verified on the English UI. The others are best guesses at
  // LinkedIn's translations. A missing label is harmless: the menu is closed and
  // the script reports that the message can't be edited instead of clicking anything.
  // ---------------------------------------------------------------------------
  const EDIT_LABELS = [
    "Edit",
    "Editar",
    "Modifier",
    "Bearbeiten",
    "Modifica",
    "Bewerken",
  ];

  const TAG = "[li-up-edit]";

  // Debug logging (every Up press and why it was acted on or skipped) is toggled
  // from the Tampermonkey toolbar menu and remembered across page loads.
  let debugOn = GM_getValue("debug", false);
  // Debug lines carry milliseconds since the last Up press, to show the order of
  // focus changes during an edit.
  let traceStart = performance.now();
  const debug = (...args) =>
    debugOn &&
    console.log(
      TAG,
      `+${Math.round(performance.now() - traceStart)}ms`,
      ...args,
    );

  // A short label for an element in debug output, like div.msg-form__contenteditable.
  function describe(el) {
    if (!el || !el.tagName) return String(el);
    const cls =
      typeof el.className === "string"
        ? el.className.trim().split(/\s+/).slice(0, 2).join(".")
        : "";
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  }

  let debugMenuId;
  function registerDebugMenu() {
    if (debugMenuId !== undefined) GM_unregisterMenuCommand(debugMenuId);
    debugMenuId = GM_registerMenuCommand(
      `Debug logging: ${debugOn ? "ON" : "OFF"}`,
      () => {
        debugOn = !debugOn;
        GM_setValue("debug", debugOn);
        console.log(TAG, `debug logging ${debugOn ? "on" : "off"}`);
        registerDebugMenu();
      },
    );
  }
  registerDebugMenu();

  debug("loaded on", location.href);

  // The chat overlay lives in an open shadow root on #interop-outlet. Events from
  // inside it reach window retargeted to the host, and composedPath() still
  // exposes the real element. The full /messaging/ page renders in the document.
  const SHADOW_HOST = "#interop-outlet";
  const COMPOSER = ".msg-form__contenteditable";
  const EDIT_FORM = ".msg-edit-form__base-form";
  // One per chat bubble. Holds that chat's message list and composer.
  const CONVERSATION = ".msg-convo-wrapper";
  const MESSAGE_LIST = ".msg-s-message-list";
  const OWN_MESSAGE = ".msg-s-event-listitem:not(.msg-s-event-listitem--other)";
  const OPTIONS_TRIGGER = ".msg-s-event-listitem__options-trigger";
  // A closed menu keeps its old items in the DOM, so only look inside an open one.
  const OPEN_MENU_ITEM =
    ".artdeco-dropdown__content--is-open .artdeco-dropdown__item";

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  // Empty means no text and at most one block. Blank lines from Shift+Enter add
  // extra blocks, and Up should move the caret through those, not open an edit.
  // trim() also strips the non-breaking space an empty composer holds.
  function isEmpty(el) {
    return el.textContent.trim() === "" && el.children.length <= 1;
  }

  // Polls until find() returns something, or gives up after timeoutMs.
  function waitFor(find, timeoutMs = 2000) {
    return new Promise((resolve) => {
      const start = performance.now();
      (function tick() {
        const found = find();
        if (found) return resolve(found);
        if (performance.now() - start > timeoutMs) return resolve(null);
        setTimeout(tick, 50);
      })();
    });
  }

  // In the chat overlay, every bubble has its own wrapper. Elsewhere (such as the
  // full /messaging/ page) climb to the nearest ancestor holding exactly one
  // message list, and give up if a climb reaches several, since that would mix
  // conversations.
  function conversationFor(el) {
    const wrapper = el.closest(CONVERSATION);
    if (wrapper) return wrapper;
    for (let node = el.parentElement; node; node = node.parentElement) {
      const lists = node.querySelectorAll(MESSAGE_LIST).length;
      if (lists === 1) return node;
      if (lists > 1) return null;
    }
    return null;
  }

  // The bottom composer of a conversation (the edit box reuses the same class).
  function findComposer(convo) {
    return (
      [...convo.querySelectorAll(COMPOSER)].find(
        (el) => !el.closest(EDIT_FORM),
      ) || null
    );
  }

  // document.activeElement stops at a shadow host, so follow it down.
  function deepActiveElement() {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement)
      active = active.shadowRoot.activeElement;
    return active;
  }

  // A short-lived note just above the composer. It lives on document.body with
  // fixed positioning, so the chat's shadow root styles and scroll containers
  // can't hide or clip it.
  function showNotice(composer, text) {
    const rect = composer.getBoundingClientRect();
    const note = document.createElement("div");
    note.textContent = text;
    note.setAttribute("role", "status");
    Object.assign(note.style, {
      position: "fixed",
      left: `${rect.left}px`,
      top: `${Math.max(0, rect.top - 34)}px`,
      maxWidth: `${Math.max(rect.width, 200)}px`,
      zIndex: "10000",
      padding: "4px 10px",
      borderRadius: "12px",
      background: "rgba(0, 0, 0, 0.8)",
      color: "#fff",
      font: "13px/1.4 system-ui, sans-serif",
      pointerEvents: "none",
      transition: "opacity 300ms",
    });
    document.body.appendChild(note);
    setTimeout(() => (note.style.opacity = "0"), 1800);
    setTimeout(() => note.remove(), 2200);
  }

  // Focuses el and puts the caret after its last character.
  function placeCaretAtEnd(el) {
    el.focus();
    const range = document.createRange();
    if (isEmpty(el)) {
      // An empty composer holds <p>&nbsp;<br></p>. The end of that is after the
      // invisible space, so typing would start with one. Use the start instead.
      const block = el.firstElementChild;
      range.setStart(block && block.nodeName !== "BR" ? block : el, 0);
    } else {
      let node = el;
      while (node.lastChild) node = node.lastChild;
      if (node.nodeType === Node.TEXT_NODE) range.setStart(node, node.length);
      // A trailing <br> is padding after the text. The caret belongs before it.
      else if (node.nodeName === "BR") range.setStartBefore(node);
      else range.setStartAfter(node);
    }
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // ---------------------------------------------------------------------------
  // Focus handling
  //
  // LinkedIn leaves focus nowhere when an edit box opens (whether from the Up key
  // or from clicking Edit by hand) and when it closes on save or cancel. So the
  // script reacts to those DOM changes: an edit box appearing gets focus, and a
  // closing one hands focus to the bottom composer.
  //
  // LinkedIn does focus a new edit box itself, but debug traces show focus then
  // sitting on the dropdown's menu panel (.artdeco-dropdown__content), with no
  // focusin for that move. About 200ms later the panel closes and focus drops to
  // <body> (that part does fire focusout). So the target is held: until the
  // user's next click or key press, any focus move away from it is undone,
  // checked on focusin, focusout, and DOM changes. No timers are involved. The
  // hold ends on the user's own input.
  // ---------------------------------------------------------------------------

  let holdTarget = null; // () => element to keep focused, or null

  function hold(find, label) {
    holdTarget = find;
    debug("holding focus on", label);
    enforceHold();
  }

  function enforceHold() {
    if (!holdTarget) return;
    const el = holdTarget();
    // Skip a target that's gone or hidden (a minimized chat), rather than move the
    // page's selection into something the user can't see.
    if (!el || !el.isConnected || el.getClientRects().length === 0) return;
    const active = deepActiveElement();
    if (active === el) return;
    debug("focus was on", describe(active), "moving it back to", describe(el));
    placeCaretAtEnd(el);
  }

  // The user acting ends the hold. Capture phase, so it runs before the page.
  function releaseHold(e) {
    if (holdTarget) debug("hold released by", e.type);
    holdTarget = null;
  }
  window.addEventListener("pointerdown", releaseHold, true);
  window.addEventListener("keydown", releaseHold, true);
  // Focus moving while a hold is active means the page moved it. Let the page's
  // handler finish, then put focus back.
  window.addEventListener(
    "focusin",
    (e) => {
      debug(
        "focusin",
        describe(e.composedPath()[0]),
        holdTarget ? "(hold active)" : "",
      );
      if (holdTarget) queueMicrotask(enforceHold);
    },
    true,
  );
  // Losing focus fires focusout on the element that had it, even in cases where
  // the move doesn't show up as a focusin. The microtask runs once the code that
  // moved focus has finished, so the new active element is in place by then.
  window.addEventListener(
    "focusout",
    (e) => {
      debug(
        "focusout",
        describe(e.composedPath()[0]),
        "->",
        describe(e.relatedTarget),
        holdTarget ? "(hold active)" : "",
      );
      if (holdTarget) queueMicrotask(enforceHold);
    },
    true,
  );

  // Edit forms currently open, mapped to their conversation.
  const openForms = new Map();
  const roots = [document];

  function scanEditForms(silent) {
    for (const [form, convo] of openForms) {
      if (form.isConnected) continue;
      openForms.delete(form);
      // A re-render swaps in a new form in the same conversation. That form is
      // picked up below, so this isn't a close.
      if (!convo.isConnected || convo.querySelector(EDIT_FORM)) continue;
      debug("edit closed");
      hold(() => findComposer(convo), "composer");
    }
    for (const root of roots) {
      for (const form of root.querySelectorAll(EDIT_FORM)) {
        if (openForms.has(form)) continue;
        openForms.set(form, conversationFor(form) || form.parentElement);
        if (silent) continue;
        debug("edit opened");
        hold(
          () => (form.isConnected ? form.querySelector(COMPOSER) : null),
          "edit box",
        );
      }
    }
  }

  // The chat overlay's shadow root can appear after this script starts, and
  // document observers don't see inside it, so it gets its own observer.
  function watchShadowRoot() {
    const shadow = document.querySelector(SHADOW_HOST)?.shadowRoot;
    if (!shadow || roots.includes(shadow)) return;
    roots.push(shadow);
    new MutationObserver(onMutations).observe(shadow, {
      childList: true,
      subtree: true,
    });
  }

  function onMutations() {
    watchShadowRoot();
    scanEditForms(false);
    // LinkedIn re-rendering can drop focus to <body>, which fires no focus event.
    enforceHold();
  }

  // Edit forms already open at load belong to the user. Record them without
  // grabbing focus, then start watching.
  watchShadowRoot();
  scanEditForms(true);
  new MutationObserver(onMutations).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ---------------------------------------------------------------------------
  // Up arrow
  // ---------------------------------------------------------------------------

  // Set while a press is being handled, so key repeat or a double tap can't click
  // the options trigger a second time and close the menu the first press opened.
  let busy = false;

  async function editLastMessage(composer) {
    const convo = conversationFor(composer);
    if (!convo) return console.warn(TAG, "no conversation found for composer");

    const mine = [...convo.querySelectorAll(OWN_MESSAGE)].filter((m) =>
      m.querySelector(OPTIONS_TRIGGER),
    );
    const last = mine[mine.length - 1];
    if (!last) return showNotice(composer, "No sent message to edit");

    debug(`found ${mine.length} sent messages, last is`, last);

    // Whether a message can be edited isn't exposed anywhere (not in the DOM, not
    // in the messages API), and the menu items render only while the dropdown is
    // open. LinkedIn allows edits for 60 minutes, after which the menu just lacks
    // Edit. So open the menu and look. If it is already open, a click would close
    // it, so only click a closed trigger.
    const trigger = last.querySelector(OPTIONS_TRIGGER);
    if (trigger.getAttribute("aria-expanded") !== "true") trigger.click();

    // Decide as soon as the menu's items render, so a menu without Edit only
    // flickers.
    const items = await waitFor(() => {
      const found = [...last.querySelectorAll(OPEN_MENU_ITEM)];
      return found.length ? found : null;
    });
    const editItem = items?.find((item) =>
      EDIT_LABELS.includes(item.textContent.trim()),
    );
    if (editItem) {
      debug("clicking Edit");
      // The edit box gets focus when it appears (see Focus handling).
      return editItem.click();
    }

    if (trigger.getAttribute("aria-expanded") === "true") trigger.click();
    // Usually the 60-minute limit has passed. A UI language missing from
    // EDIT_LABELS looks the same, so the notice doesn't claim a reason.
    showNotice(
      composer,
      items
        ? "Your last message can't be edited"
        : "Couldn't open the message's menu",
    );
    // Closing the menu hands focus to its trigger. Return it to the composer.
    hold(() => composer, "composer");
  }

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key !== "ArrowUp" || e.isComposing) return;
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey)
        return debug("skip: modifier held");

      const target = e.composedPath()[0];
      debug("ArrowUp target", target);
      // Duck-typed rather than instanceof Element: under Tampermonkey's sandbox
      // the page's elements can fail an instanceof check against the script's realm.
      if (!target || typeof target.closest !== "function")
        return debug("skip: target is not an element");
      const composer = target.closest(COMPOSER);
      // Only the bottom composer, and only when empty, so Up still moves the
      // caret through a draft and works normally inside the edit box.
      if (!composer) return debug("skip: not in a message composer");
      if (composer.closest(EDIT_FORM))
        return debug("skip: already in the edit box");
      if (!isEmpty(composer)) return debug("skip: composer has text");

      e.preventDefault();
      e.stopPropagation();
      if (busy || e.repeat) return debug("skip: already handling an Up press");

      busy = true;
      traceStart = performance.now();
      editLastMessage(composer)
        .catch((err) => console.error(TAG, err))
        .finally(() => (busy = false));
    },
    true,
  );
})();
