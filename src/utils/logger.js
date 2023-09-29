// @ts-check

const moment = require("moment");
const util = require("util");
const chalk = import("chalk").then(c => c.default);

module.exports = class Logger {
  static log(content, dir, { color = "blue", tag = "LOG" } = {}) {
    this.write(content, dir, { color, tag });
  }

  static warn(content, dir, { color = "orange", tag = "WARN" } = {}) {
    this.write(content, dir, { color, tag });
  }

  static error(content, dir, { color = "red", tag = "ERROR" } = {}) {
    this.write(content, dir, { color, tag, error: true });
  }

  static async write(content, dir, { color = "grey", tag = "LOG", error = false } = {}) {
    const _chalk = await chalk;
    const timestamp = _chalk.cyan(
      `[${moment().format("DD-MM-YYYY kk:mm:ss")}]:`
    );
    const levelTag = _chalk.bold(`[${tag}]`);
    const text = _chalk[color](this.clean(content));
    const stream = error ? process.stderr : process.stdout;
    stream.write(`[${timestamp}] ${levelTag} [${dir}] ${text}\n`);
  }

  static clean(item) {
    if (typeof item === "string") return item;
    const cleaned = util.inspect(item, { depth: Infinity });
    return cleaned;
  }
};
