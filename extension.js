const vscode = require("vscode");
const axios = require("axios");
const barItems = {};
let interval;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate() {
  const updateInterval =
    vscode.workspace.getConfiguration("vstock-watcher")
      .updateInterval || 30000;

  init();
  interval = setInterval(async () => {
    init();
  }, updateInterval);
}
exports.activate = activate;

function deactivate() {
  clearInterval(interval);
}

async function init() {
  const stocks = await fetchData();
  updateStatusBarItem(stocks);
}

async function fetchData() {
  const baseUrl = "http://mis.twse.com.tw/stock/api/getStockInfo.jsp";
  const codes =
    vscode.workspace.getConfiguration("vstock-watcher").stocks || [];

  const queryStr = codes.join("|");

  try {
    const res = await axios.get(
      `${baseUrl}?ex_ch=${queryStr}&json=1&delay=0`
    );

    const stocks = res.data.msgArray.map((el) => ({
      name: el.n,
      price: +el.pz,
      code: el.c,
      yesterday: +el.y,
    }));

    return stocks;
  } catch (error) {
    console.error(error);
    return [];
  }
}

function getText(stock) {
  return `${stock.name} ${stock.price}`;
}

function getColor(stock) {
  const {
    riseColor = "#ed7e7e",
    fallColor = "#78e378",
  } = vscode.workspace.getConfiguration("vstock-watcher");

  return stock.price > stock.yesterday ? riseColor : fallColor;
}

function getTooltip(stock) {
  const diff = stock.price - stock.yesterday;
  const prefix = diff > 0 ? "+" : "-";
  return `${prefix}${diff.toFixed(2)}`;
}

function createStatusBarItem(stock) {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    Number.MAX_VALUE
  );
  item.text = getText(stock);
  item.color = getColor(stock);
  item.tooltip = getTooltip(stock);
  item.show();

  return item;
}

function updateStatusBarItem(stocks = []) {
  stocks.forEach((stock) => {
    const { code } = stock;

    if (barItems[code]) {
      barItems[code].text = getText(stock);
      barItems[code].color = getColor(stock);
      barItems[code].tooltip = getTooltip(stock);
    } else {
      barItems[code] = createStatusBarItem(stock);
    }
  });
}

module.exports = {
  activate,
  deactivate,
};
