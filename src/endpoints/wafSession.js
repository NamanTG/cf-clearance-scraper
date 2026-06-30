async function findAcceptLanguage(page) {
  return await page.evaluate(async () => {
    const result = await fetch("https://httpbin.org/get")
      .then((res) => res.json())
      .then(
        (res) =>
          res.headers["Accept-Language"] || res.headers["accept-language"]
      )
      .catch(() => null);
    return result;
  });
}

function getSource({ url, proxy }) {
  return new Promise(async (resolve, reject) => {
    if (!url) return reject("Missing url parameter");
    const context = await global.browser
      .createBrowserContext({
        proxyServer: proxy ? `http://${proxy.host}:${proxy.port}` : undefined, // https://pptr.dev/api/puppeteer.browsercontextoptions
      })
      .catch(() => null);
    if (!context) return reject("Failed to create browser context");

    let isResolved = false;

    var cl = setTimeout(async () => {
      if (!isResolved) {
        await context.close();
        reject("Timeout Error");
      }
    }, global.timeOut || 60000);

    try {
      const page = await context.newPage();

      if (proxy?.username && proxy?.password)
        await page.authenticate({
          username: proxy.username,
          password: proxy.password,
        });
      let acceptLanguage = await findAcceptLanguage(page);
      await page.setRequestInterception(true);
      page.on("request", async (request) => request.continue());

      
      let cfChallengeSeen = false;

      page.on("response", async (res) => {
        console.log(res.url());
        try {
          const resUrl = new URL(res.url());
      
          if (resUrl.searchParams.has("__cf_chl_f_tk")) {
            cfChallengeSeen = true;
          }
      
          const targetHost = new URL(url).hostname;
          const responseHost = new URL(res.url()).hostname;
          
          if (
            [200, 302].includes(res.status()) &&
            cfChallengeSeen &&
            responseHost === targetHost
          ) {
            await page
              .waitForNavigation({ waitUntil: "load", timeout: 5000 })
              .catch(() => {});
      
            const cookies = await page.cookies();
            let headers = await res.request().headers();
      
            delete headers["content-type"];
            delete headers["accept-encoding"];
            delete headers["accept"];
            delete headers["content-length"];
      
            headers["accept-language"] = acceptLanguage;
      
            await context.close();
            isResolved = true;
            clearTimeout(cl);
            resolve({ cookies, headers });
          }
        } catch (e) {}
      });

      await page.goto(url, {
        waitUntil: "domcontentloaded",
      });
    } catch (e) {
      if (!isResolved) {
        await context.close();
        clearInterval(cl);
        reject(e.message);
      }
    }
  });
}
module.exports = getSource;
