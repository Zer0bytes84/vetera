// After a click on a filter, a click on the loupe (or the field's padding) gives the input back the keyboard.
import { launch, open, boot, openPalette } from "./banc.mjs";
const URL_ = process.argv[2];
const browser = await launch();
const page = await open(browser, { scale: 1 });
await boot(page, URL_); await openPalette(page);
await page.getByRole("tab", { name: /Dossiers/ }).click();
await page.locator(".command-palette-field-icon").click();
await page.keyboard.type("rex"); await page.waitForTimeout(300);
const a = await page.locator("[data-command-palette-input]").inputValue();
await page.getByRole("tab", { name: /Tout/ }).click();
const box = await page.locator(".command-palette-field").boundingBox();
await page.mouse.click(box.x + 6, box.y + box.height / 2);
await page.keyboard.type("x"); await page.waitForTimeout(200);
const b = await page.locator("[data-command-palette-input]").inputValue();
const order = await page.evaluate(() => [...document.querySelectorAll(".command-palette-field input, .command-palette-field button")].map((e) => e.getAttribute("aria-label") || e.textContent.trim()));
console.log(JSON.stringify({ apresLoupe: a, apresMarge: b, ordreTab: order, erreurs: page.errors }));
await browser.close();
