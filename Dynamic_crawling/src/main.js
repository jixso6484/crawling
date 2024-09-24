const { Builder, By, Key, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const path = require('path');
const proxy = require('selenium-webdriver/proxy');
const cheerio = require('cheerio'); // cheerio 모듈 추가

//추가할점 header

//프록시
const proxy_ = 'your-proxy-sercer:port';

const options = new edge.Options();
options.setProxy(proxy.manual({http:proxy_,https:proxy_}));
// EdgeDriver 경로 설정 (EdgeDriver 파일 경로)
const edgeDriverPath = path.join(__dirname, '../Edge_dr', 'msedgedriver.exe');

// 랜덤 함수로 사람처럼 보이도록 슬립 기능 사용
let randomInt = getRandomInt(1, 10);

const domain_Groups = new Map();
const filtering = ['undefined', '중복된', '광고',"https://support.google.com/websearch/answer"];

function extraDomain(url) {
    const domain = url.split('/')[2];
    return domain;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sleep() {
    let sleep_timer = getRandomInt(1, 10) * 1000; // 초 단위
    return new Promise(resolve => setTimeout(resolve, sleep_timer));
}

// 중복 체크 및 URL 추가 함수 (depth 인자를 추가)
function check_insertUrl(url, depth) {
    const domain = extraDomain(url);
    if (!domain_Groups.has(domain)) {
        domain_Groups.set(domain, new Set());
    }

    const group = domain_Groups.get(domain);
    if (!group.has(url)) {
        group.add(url);
        console.log(`Depth ${depth} - URL 저장됨: ${url}`);
    } else {
        console.log(`중복된 URL (Depth ${depth}): ${url}`);
    }
}

// 검색 함수에서 페이지의 HTML 소스를 가져오는 함수
async function get_html(driver) {
    try {
        let pageHTML = await driver.getPageSource();
        return pageHTML;
    } catch (error) {
        console.log('get_html_error:', error.message);
    }
}

// 브라우저 열기 함수
async function open_browser(driver, url) {
    try {
        await driver.get(url);
    } catch (error) {
        console.log('open_browser_error:', error.message);
    }
}

// 검색 실행 함수
async function search_browser(driver, searchQuery) {
    try {
        await driver.findElement(By.name('q')).sendKeys(searchQuery, Key.RETURN);
        await driver.wait(until.titleContains(searchQuery), 5000);
    } catch (error) {
        console.log('search_browser_error:', error.message);
    }
}

// 데이터 추출 함수
async function fetch_Data(depth, html) {
    try {
        const $ = cheerio.load(html);

        $('a, p, div').each(function (idx) {
            let text = $(this).text() ? $(this).text().trim() : '';
            let href = $(this).attr('href') ? $(this).attr('href').trim() : '';

            if (text && href && !filtering.some(word => text.includes(word))) {
                check_insertUrl(href, depth);
            }
        });
    } catch (error) {
        console.log("fetch_Data_error:", error.message);
    }
}

// 메인 크롤링 프로세스
async function main_proeccess_depth(height, startUrl, searchQuery) {
    let depth = 0;
    let driver = new Builder().forBrowser('MicrosoftEdge').build();

    await open_browser(driver, startUrl);
     
    let html = await get_html(driver);

    while (depth <= height) {
        if (depth === 0) {
            await fetch_Data(depth, html);  // 시작 URL 전달
        } else {
            for (const group of domain_Groups.values()) {
                for (const new_url of group) {
                    if (new_url.startsWith("https://")) {
                        await open_browser(driver, new_url);
                        html = await get_html(driver);
                        await fetch_Data(depth, html);
                        await sleep(); // 사람처럼 보이도록 슬립
                    }
                }
            }
        }
        console.log(`깊이: ${depth}`);
        depth++;
    }

    console.log('주소 크롤링 완료');
    await driver.quit();
}

(async function example() {
    const url = 'https://www.naver.com/';
    const searchQuery = '경제';

    await main_proeccess_depth(5, url, searchQuery);
})();
