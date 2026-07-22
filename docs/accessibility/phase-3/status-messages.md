# Status message evidence

Criteria: 3.3.1, 3.3.2, 4.1.3. Polite status updates do not move focus; alerts are reserved for correction-required mutation errors.

| Scenario | Expected | Actual | Result |
| --- | --- | --- | --- |
| ST-01 | Feedback success is polite and focus remains on Post feedback | Feedback posted; focus remained on Post feedback | Pass |
| ST-02 | Search result count changes without moving focus | 1 feedback result; focus remained on Search feedback | Pass |
| ST-03 | Rejected consequential mutations remain open with an urgent typed correction path and accept a retry | All five dialogs announced the typed fixture conflict, reset it, retried, and closed only after acceptance | Pass |
| ST-04 | Pending confirmation disables duplicate submission and ignores Escape until the accepted result | Archive stayed modal and busy during the deferred result, then closed and restored focus after acceptance | Pass |
| ST-05 | Loading, denied, empty, query-error, loading-more, activity, editorial, and time states use complete domain copy and recovery semantics | Installed hooks rendered every selected state with error tone, retry/correction controls, English activity/editorial labels, and UTC-formatted time | Pass |
| ST-06 | Every installed public query error uses shared default or host copy while preserving its domain action and query-owned retry | Twelve packed public recovery scenarios passed with default and sentinel guidance, unchanged labels, and observable second query attempts | Pass |
