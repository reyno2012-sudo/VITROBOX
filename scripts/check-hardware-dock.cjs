const { chromium } = require('C:/Users/reyno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ viewport: { width: 1553, height: 1244 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:3101/', { waitUntil: 'domcontentloaded' });
    const dock = page.locator('.hardware-dock');
    await dock.waitFor();
    const originalTitle = await page.locator('.gear-display-metadata dd').first().textContent();
    const volume = page.getByRole('slider', { name: 'Volume', exact: true });
    await volume.focus(); await volume.press('Home');
    if (await volume.inputValue() !== '0') throw Error('Volume did not update');
    await volume.press('End');
    if (await volume.inputValue() !== '1') throw Error('Volume end did not update');
    const seek = page.getByRole('slider', { name: 'Playback position', exact: true });
    await seek.focus(); await seek.press('ArrowRight');
    if (Number(await seek.inputValue()) <= 0) throw Error('Seek did not update');
    await page.getByRole('button', { name: 'Next track', exact: true }).click();
    if (await page.locator('.gear-display-metadata dd').first().textContent() === originalTitle) throw Error('Next track did not update display');
    await page.getByRole('button', { name: 'Previous track', exact: true }).click();
    if (await page.locator('.gear-display-metadata dd').first().textContent() !== originalTitle) throw Error('Previous track did not restore display');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Play', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'WAVE', exact: true }).click();
    if (await page.getByRole('button', { name: 'WAVE', exact: true }).getAttribute('aria-pressed') !== 'true') throw Error('Mode did not change');
    await page.getByRole('button', { name: 'Pale pink', exact: true }).click();
    if (await page.getByRole('button', { name: 'Pale pink', exact: true }).getAttribute('aria-pressed') !== 'true') throw Error('Aura did not change');
    const knob = page.getByRole('slider', { name: 'SPEED', exact: true });
    await knob.focus(); await knob.press('ArrowRight');
    if (await knob.getAttribute('aria-valuenow') !== '52') throw Error('Knob keyboard input failed');
    const rect = await knob.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2, rect.y - 15); await page.mouse.up();
    if (Number(await knob.getAttribute('aria-valuenow')) <= 52) throw Error('Knob drag failed');
    await page.getByRole('button', { name: 'FLOATING', exact: true }).click();
    await page.getByRole('button', { name: 'White', exact: true }).click();
    await dock.screenshot({ path: 'hardware-dock-preview.png' });
    for (const width of [1553, 900, 390]) {
      await page.setViewportSize({ width, height: 1244 });
      const layout = await page.locator('.gear-section').evaluateAll(nodes => nodes.map(n => ({ y: n.getBoundingClientRect().y, h: n.getBoundingClientRect().height })));
      if (new Set(layout.map(n => Math.round(n.y))).size !== 1) throw Error('Sections wrapped at ' + width);
      console.log('Single row verified at width', width);
    }
    await page.getByRole('button', { name: 'Cinema View' }).click();
    if (!await page.locator('#hardware-control-panel').evaluate(n => n.inert)) throw Error('Collapsed panel remains interactive');
    if (errors.length) throw Error(errors.join('\n'));
    console.log('PASS: seek, volume, next/previous, play/pause, mode, aura, knob drag/keyboard, collapse; no page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
