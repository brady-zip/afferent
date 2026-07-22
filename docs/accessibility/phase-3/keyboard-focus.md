# Keyboard and focus evidence

Criteria: 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11, 2.5.7.

| Scenario | Expected | Actual | Result |
| --- | --- | --- | --- |
| KF-01 | Create, search, vote, and comment controls follow DOM order with visible unobscured focus | All controls completed by keyboard with 2px focus outline and no focus theft | Pass |
| KF-02 | Popover and dialogs close on Escape, contain modal focus, and restore the invoker | Popover, withdraw dialog, and merge dialog restored their invoking buttons | Pass |
| KF-03 | Moderation, status, archive, merge, and changelog actions require no dragging | All named admin actions remained keyboard reachable; status used a native select | Pass |
| KF-04 | Archive, tag delete, publish, unpublish, and merge expose exact consequences, Escape actions, and accepted completion | All five dialogs cancelled and completed by keyboard, then restored their logical trigger | Pass |
| KF-05 | Host navigation shows one queue/detail pane below 768px, preserves current selection, and CSS restores both panes above it | Queue and detail alternated at 320px with aria-current retained; both panes were visible at 768px and 1280px | Pass |
