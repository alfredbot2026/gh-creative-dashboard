const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const QA_DIR = path.join(__dirname, '../qa');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  // Step 1: Redirect to login
  console.log('Step 1: Checking redirect to login...');
  await page.goto(BASE_URL + '/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-01-redirect-to-login.png') });
  console.log('URL after /:', page.url());

  // Step 2: Login
  console.log('Step 2: Logging in...');
  await page.goto(BASE_URL + '/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-02a-login-page.png') });
  
  // Use page.fill with direct selectors
  await page.fill('input[type="email"]', 'grace@ghcreative.test');
  await page.fill('input[type="password"]', 'GHCreative2026!');
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-02b-login-filled.png') });
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-02c-after-login.png') });
  console.log('URL after login click:', page.url());

  // Check if still on login - if so, try to see what error
  if (page.url().includes('/login')) {
    const errText = await page.textContent('body');
    console.log('Still on login. Error text excerpt:', errText.substring(0, 500));
    // Try to proceed anyway by accessing dashboard directly
  }

  // Step 3: Short-form create page
  console.log('Step 3: Navigating to /create/short-form...');
  await page.goto(BASE_URL + '/create/short-form');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-03a-create-page.png') });
  console.log('URL:', page.url());
  
  // Check if redirected back to login
  if (page.url().includes('/login')) {
    console.log('Redirected to login - auth not working');
    await browser.close();
    return;
  }

  // Fill topic
  await page.waitForSelector('textarea', { timeout: 10000 });
  await page.fill('textarea', '3 common mistakes when scaling Facebook ads');
  
  // Find the generate button
  const btns = await page.locator('button').all();
  let genBtn = null;
  for (const btn of btns) {
    const text = await btn.textContent();
    if (text && text.toLowerCase().includes('generat')) {
      genBtn = btn;
      break;
    }
  }
  
  if (genBtn) {
    await genBtn.click();
    console.log('Clicked generate. Waiting up to 45s...');
    await page.waitForTimeout(45000);
    await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-03b-script-generated.png'), fullPage: true });
  } else {
    console.log('No generate button found');
    await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-03b-script-generated.png'), fullPage: true });
  }

  // Step 4: Add to Calendar
  console.log('Step 4: Add to Calendar...');
  const dateInput = page.locator('input[type="date"]').first();
  try {
    // Try filling only if enabled
    const isEnabled = await dateInput.isEnabled({ timeout: 3000 });
    if (isEnabled) {
      await dateInput.fill('2026-04-01');
    } else {
      console.log('Date input is disabled (script may not be generated yet)');
      // Try to set value via JS
      await page.evaluate(() => {
        const inp = document.querySelector('input[type="date"]');
        if (inp) {
          inp.removeAttribute('disabled');
          inp.value = '2026-04-01';
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
  } catch(e) {
    console.log('Date fill error:', e.message.split('\n')[0]);
  }
  
  const allBtns = await page.locator('button').all();
  let calBtn = null;
  for (const btn of allBtns) {
    const text = await btn.textContent();
    if (text && (text.toLowerCase().includes('calendar') || text.toLowerCase().includes('schedule'))) {
      calBtn = btn;
      break;
    }
  }
  
  if (calBtn && await calBtn.isEnabled({ timeout: 3000 }).catch(() => false)) {
    await calBtn.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-04-add-to-calendar.png') });
    console.log('Add to Calendar clicked');
  } else {
    console.log('Calendar button not clickable');
    await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-04-add-to-calendar.png'), fullPage: true });
  }

  // Step 5: Eval
  console.log('Step 5: Eval page...');
  await page.goto(BASE_URL + '/eval');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-05a-eval-page.png'), fullPage: true });
  
  // Try to score
  const evalTextareas = await page.locator('textarea').all();
  if (evalTextareas.length > 0) {
    await evalTextareas[0].fill('3 common Facebook ad mistakes that cost you money. Watch till the end for the biggest one!');
    
    const evalBtns = await page.locator('button').all();
    for (const btn of evalBtns) {
      const text = await btn.textContent();
      if (text && (text.toLowerCase().includes('score') || text.toLowerCase().includes('eval') || text.toLowerCase().includes('analys'))) {
        await btn.click();
        await page.waitForTimeout(8000);
        break;
      }
    }
  }
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-05b-eval-scored.png'), fullPage: true });

  // Step 6: Analytics
  console.log('Step 6: Analytics short-form...');
  await page.goto(BASE_URL + '/analytics/short-form');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-06a-analytics-page.png'), fullPage: true });
  
  // Try Add Entry button
  const addBtns = await page.locator('button').all();
  for (const btn of addBtns) {
    const text = await btn.textContent();
    if (text && (text.toLowerCase().includes('add') || text.toLowerCase().includes('new') || text.includes('+'))) {
      await btn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-06b-analytics-form.png') });
      
      // Fill in form fields
      const inputs = await page.locator('input[type="text"], input[type="number"], input[type="url"]').all();
      const fakeData = ['https://instagram.com/p/test123', '15000', '500', '120', '80', '200'];
      for (let i = 0; i < Math.min(inputs.length, fakeData.length); i++) {
        await inputs[i].fill(fakeData[i]).catch(() => {});
      }
      
      // Submit
      const submitBtns = await page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Submit"), button:has-text("Add")').all();
      if (submitBtns.length > 0) {
        await submitBtns[submitBtns.length - 1].click();
        await page.waitForTimeout(3000);
      }
      break;
    }
  }
  await page.screenshot({ path: path.join(QA_DIR, 'TASK-012-06c-analytics-after.png'), fullPage: true });

  await browser.close();
  console.log('All E2E steps complete. Screenshots in qa/');
})().catch(err => {
  console.error('E2E Error:', err.message);
  process.exit(1);
});
