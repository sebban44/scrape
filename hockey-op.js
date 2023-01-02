import { utcFormat } from 'd3';
import puppeteer from 'puppeteer';
import odds from 'odds-converter';
import moment from 'moment';

import TelegramBot from 'node-telegram-bot-api';
/*TELEGRAM SEND NOTIFICATION */

// replace the value below with the Telegram token you receive from @BotFather
const token = '5828686397:AAHns3Y8fOKSNzZQSJ2Wz14NjCBOTQakZOA';

var chatId = -671757481;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});

function getMatches() {

(async () => {
  const browser = await puppeteer.launch(); // {headless: false}
  const page = await browser.newPage();


  console.log("Browser launched and page opened")

  let p = 'https://oddsportal.com/matches/hockey'

  await page.goto('https://oddsportal.com/matches/hockey');

  console.log('Navigated to page: ' + p)

  console.log('Getting links from page: ' + p)

  const links = await page.evaluate(
    () => Array.from(
      document.querySelectorAll('a[href]'),
      a => a.getAttribute('href')
    )
  );

  console.log('Number of links retrivied: ' + links.length)


  for (let l = 0; l < links.length; l++) {
    let res = links[l];
    if (res.length > 50 & res.startsWith('/hockey/') & !res.includes("inplay")) {
      try {
        page.goto('https://oddsportal.com/' + res, { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('#col-content > h1:nth-child(1)')
        let match_el = await page.$('#col-content > h1:nth-child(1)')
        let match = await page.evaluate(el => el.textContent, match_el)
        let date_el = await page.$('.date')
        let date = await page.evaluate(el => el.textContent, date_el)

        //Handling dates
        let date_day = utcFormat('%Y-%m-%d')(new Date(date))
        let date_time = date.split(' ')[5].split('.').reverse().join('-')
        let mt = date_day + " " + date_time
        let match_time = moment(mt).format('YYYY-MM-DD HH:mm:ss')
        let utc_match_time = moment(match_time).add(1, 'hours');
        let t = moment()
        let time = moment(t).format('YYYY-MM-DD HH:mm:ss')

        let diff = moment(time).diff(utc_match_time, 'minutes')

        if (diff >= -60 & diff <= 0) {

          const data = await page.evaluate(() => {
            const tds = Array.from(document.querySelectorAll('tr.lo'))
            return tds.map(td => td.innerText.split('\n\t\n').join(',').split('\n\t').join(',').split('\t').join(',').split(','))
          });

          let bookie = data.map(d => d[0].trim(''));
          let home_odds = data.map(d => d[1]);
          let draw_odds = data.map(d => d[2]);
          let away_odds = data.map(d => d[3]);

          let obj = {
            event: [{
              match: match,
              odds: [
                {
                  bookmaker: bookie,
                  bookmaker_odds: [{
                    home: home_odds,
                    draw: draw_odds,
                    away: away_odds
                  }]
                }
              ]
             }
            ]
          }

          let result = JSON.parse(JSON.stringify(obj))
          
         for(let r = 0; r < result.event.length; r++) {

          let m = result.event[r].match

          let b = result.event[r].odds[0].bookmaker

          let pin_h = odds.american.toDecimal(result.event[r].odds[0].bookmaker_odds[0].home[b.indexOf('Pinnacle')])
          let pin_d = odds.american.toDecimal(result.event[r].odds[0].bookmaker_odds[0].draw[b.indexOf('Pinnacle')])
          let pin_a = odds.american.toDecimal(result.event[r].odds[0].bookmaker_odds[0].away[b.indexOf('Pinnacle')])
          
          let uni_h = odds.american.toDecimal(result.event[r].odds[0].bookmaker_odds[0].home[b.indexOf('Unibet')])
          let uni_d = odds.american.toDecimal(result.event[r].odds[0].bookmaker_odds[0].draw[b.indexOf('Unibet')])
          let uni_a = odds.american.toDecimal(result.event[r].odds[0].bookmaker_odds[0].away[b.indexOf('Unibet')])
      
          let margin = (1 / pin_h + 1 / pin_d + 1 / pin_a) - 1
         
          let true_h = 1 / ((3*pin_h)/(3-(margin*pin_h)))
          let true_d = 1 / ((3*pin_d)/(3-(margin*pin_d)))
          let true_a = 1 / ((3*pin_a) /(3-(margin*pin_a)))

          let home_value = uni_h * true_h -1
          let draw_value = uni_d * true_d -1
          let away_value = uni_a * true_a -1

          if(home_value >= 0.03) {
            bot.sendMessage(chatId,
              "Match: " + m + "\n" +
              "Bet: 1" + "\n" +
              "Odds: " + uni_h + "\n" +
              "Value: " + home_value.toFixed(3) * 100
            )
          } else if(draw_value >= 0.03) {
            bot.sendMessage(chatId,
              "Match: " + m + "\n" +
              "Bet: X" + "\n" +
              "Odds: " + uni_d + "\n" +
              "Value: " + draw_value.toFixed(3) * 100
            )
          } else if(away_value >= 0.03) {
            bot.sendMessage(chatId,
              "Match: " + m + "\n" +
              "Bet: 2" + "\n" +
              "Odds: " + uni_a + "\n" +
              "Value: " + away_value.toFixed(3) * 100
            )
          } else {
            //console.log("no value bet found")
            }
        }
      } else {
        console.log("Match is already started or is not in the next hour, skipping...")
      }

      } catch (e) {
        console.log(e)
      }
    } else {
      // console.log("Not a match link, skipping..." + res)
    }
  }

  await browser.close();
  console.log("Finished scraping. Browser closed...")
  setTimeout(getMatches, 60000)
})();
}
setTimeout(getMatches, 60000)