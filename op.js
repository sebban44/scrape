import puppeteer from 'puppeteer';


(async () => {
  const browser = await puppeteer.launch(); // {headless: false}
  const page = await browser.newPage();

  
  console.log("Browser launched and page opened")
   
  let p = 'https://oddsportal.com/matches/soccer'

  await page.goto('https://oddsportal.com/matches/soccer');

  console.log('Navigated to page: ' + p)
  
  console.log('Getting links from page: ' + p)

  const links = await page.evaluate(
    () => Array.from(
      document.querySelectorAll('a[href]'),
      a => a.getAttribute('href')
    )
  );

  console.log('Number of links retrivied: ' + links.length)

 
  for(let l = 0; l < links.length; l++) {
    let res = links[l];
    if(res.length > 50 & res.startsWith('/soccer/') & !res.includes("inplay")) {
      try {
        page.goto('https://oddsportal.com/' + res, { waitUntil: 'domcontentloaded' });    
        //Match
        await page.waitForSelector('#col-content > h1:nth-child(1)')
        let match_el = await page.$('#col-content > h1:nth-child(1)')
        let match = await page.evaluate(el => el.textContent, match_el)
        let date_el = await page.$('.date')
        let date = await page.evaluate(el => el.textContent, date_el)
        console.log(date)
        console.log(match)

        const data = await page.evaluate(() => {
          const tds = Array.from(document.querySelectorAll('tr.lo'))
          return tds.map(td => td.textContent)
        });

        console.log(data)
       
      } catch (e) {
        //console.log(e)
      }
    } else {
      // console.log("Not a match link, skipping..." + res)
    } 
  }

  await browser.close();
  console.log("Finished scraping. Browser closed...")
})();