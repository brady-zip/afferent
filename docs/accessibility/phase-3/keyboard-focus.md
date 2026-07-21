# Keyboard and focus evidence

Criteria: 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11, 2.5.7.

| Scenario | Expected | Actual | Result |
| --- | --- | --- | --- |
| KF-01 | Create, search, vote, and comment controls follow DOM order with visible unobscured focus | All controls completed by keyboard with 2px focus outline and no focus theft | Pass |
| KF-02 | Popover and dialogs close on Escape, contain modal focus, and restore the invoker | Popover, withdraw dialog, and merge dialog restored their invoking buttons | Pass |
| KF-03 | Moderation, status, archive, merge, and changelog actions require no dragging | All named admin actions remained keyboard reachable; status used a native select | Pass |
