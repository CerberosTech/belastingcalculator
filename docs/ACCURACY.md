# Accuracy check (17-10-2026)
## Unit tests: `node --test test/` — 19/19 pass
Official Belastingdienst worked examples reproduced exactly: box 3 (5 examples on berekening-box-3-inkomen-2026: €417, €72, €4.667, €1.842, €4.973) and box 2 (€70.000 → €17.224). Plus table checks for AHK, arbeidskorting, IACK, ZA/SA/MKB, Zvw cap, zorgtoeslag table.
Rounding rules inferred from the official examples: per-bracket floor; box 3 asset returns floored, debt return rounded up, aandeel % truncated at 2 decimals, voordeel floored.

## Cross-check vs thetax.nl (employee, 2026, no holiday allowance, headless Chrome)
| Case | thetax.nl net/yr | ours | diff |
|---|---|---|---|
| €30.000 | 27.754,21 | 27.754 | 0 |
| €45.000 | 36.614,07 | 36.614 | 0 |
| €60.000 | 44.093,96 | 44.094 | 0 |
| €90.000 | 58.312,13 | 58.313 | +1 |
| €150.000 | 85.818,00 | 85.819 | +1 |
| €40.000, AOW (66+) | 38.718,53 | 38.720 | +1,5 |
| €70.000 + 30%-regeling | 63.267,10 (thetax computed on €75.600 = incl. 8% vakantiegeld) | 63.266 on €75.600 | −1 |
Differences are ≤ €2: thetax works in cents, we floor credits/brackets to whole euros as the Belastingdienst does. Neither tool models the loonheffing tables month by month (both are annual approximations); zzp/box 3/box 2 are not on thetax.nl so cannot be cross-checked.
