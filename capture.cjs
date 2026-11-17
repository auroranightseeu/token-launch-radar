// Build-time only: real Chromium renders. The runtime entry uses Node built-ins alone.
const {chromium}=require('/opt/hatch/skills/spaces/ts-runtime/dist/node_modules/playwright-core');
const fs=require('node:fs'),crypto=require('node:crypto');
(async()=>{
  const policy='/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
  const browser=await chromium.launch({executablePath:'/opt/meta-chromium/chrome',headless:true,args:[
    '--no-sandbox','--no-zygote','--single-process','--disable-crashpad-for-testing','--noerrdialogs',
    '--hatch-webgl-allowed-domains-file='+policy,
    '--hatch-webgl-allowed-domains-sha256='+crypto.createHash('sha256').update(fs.readFileSync(policy)).digest('hex')
  ]});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
  page.on('pageerror',e=>{throw e;});
  await page.goto('file://'+process.cwd()+'/out/dashboard/index.html');
  await page.locator('#rows tr').first().waitFor();
  // Keep model notes visible above the table while exposing at least ten rows.
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('.model').offsetTop-12));
  await page.screenshot({path:'screenshots/1-board.png'});
  console.log(await page.locator('#count').innerText());
  await page.locator('tbody tr').first().click();
  await page.screenshot({path:'screenshots/2-detail.png'});
  console.log('Detail:',await page.locator('#detail-title').innerText());
  await page.locator('#close').click();
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.locator('#category').selectOption('Lending');
  await page.screenshot({path:'screenshots/3-filtered.png'});
  console.log(await page.locator('#count').innerText());
  await browser.close();
})();
