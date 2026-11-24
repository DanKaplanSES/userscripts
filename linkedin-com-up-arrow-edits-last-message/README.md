# linkedin.com: Up Arrow Edits Last Message

Press Up in an empty LinkedIn message box to edit the last message you sent in
that conversation, the way Slack and Discord work.

## Install

Install a userscript manager such as Tampermonkey, then install this script
from its
[Greasy Fork page](https://greasyfork.org/en/scripts/606999-linkedin-com-up-arrow-edits-last-message).

## Usage

1. Open a conversation, either in a chat window at the bottom of the page or on
   the Messaging page.
2. With the "Write a message..." box empty, press Up.
3. Your last sent message opens for editing, with the cursor at the end of its
   text.
4. Press Enter to save, or cancel the edit. Either way, the cursor goes back to
   the empty message box so you can keep typing.

With several chat windows open, Up edits the last message in the window you're
typing in.

The script also puts the cursor in the edit box when you choose Edit from a
message's "..." menu yourself. Without it, LinkedIn leaves the cursor nowhere.

Up keeps its normal behavior when:

- the message box has text in it, or blank lines added with Shift+Enter
- Shift, Ctrl, Alt, or Meta is held down
- you're already editing a message

## Messages that can't be edited

LinkedIn only lets you edit a message for an hour after sending it. To find out
whether it still can, the script opens the message's "..." menu out of sight
and looks for Edit. If Edit isn't there, the menu closes, a short note appears
above the message box, and the cursor returns to the box.

The notes you may see:

- "Your last message can't be edited": usually the hour has passed.
- "No sent message to edit": none of your messages are loaded in this
  conversation.
- "Couldn't open the message's menu": the menu didn't appear. LinkedIn may have
  changed its page.

## Other languages

The script finds the Edit item by its label. `EDIT_LABELS`, at the top of the
script, lists the labels it accepts: `Edit`, `Editar`, `Modifier`, `Bearbeiten`,
`Modifica`, and `Bewerken`. Only `Edit` has been confirmed on LinkedIn. The
others are best guesses.

If you see "Your last message can't be edited" on a message you sent less than
an hour ago, your LinkedIn language probably uses a different word. You can add
it to `EDIT_LABELS`, but updates to the script replace your edit. Instead,
[open an issue](https://github.com/DanKaplanSES/userscripts/issues) with the
word your menu shows, so it can be added for everyone.

## Troubleshooting

In the Tampermonkey toolbar menu, this script has a "Debug logging" toggle. It
stays on or off across page loads. When it's on, the browser console shows a
line starting with `[li-up-edit]` for each Up press, explaining what the script
did or why it did nothing. Include those lines when reporting a problem.

## Privacy

The script runs only on www.linkedin.com. It makes no network requests and
sends nothing anywhere. It only clicks LinkedIn's own menu and Edit item for
you. The only thing it stores is the debug logging setting.

## Known limitations

- Tested only with Tampermonkey on Firefox.
- LinkedIn changes its page often, which can break the script. Please
  [report it](https://github.com/DanKaplanSES/userscripts/issues) if Up stops
  working.
