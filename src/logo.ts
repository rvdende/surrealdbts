// http://patorjk.com/software/taag/#p=display&f=Colossal&t=SurrealDB.ts

import { version } from './index.ts'

export const showLogo = () => {
  console.log();
  console.log('%c  .d8888b.                                            888 %c8888888b.  888888b.   %c    888             ', "color: white;", "color: magenta;", "color: blue;");
  console.log('%c d88P  Y88b                                           888 %c888  "Y88b 888  "88b  %c    888             ', "color: white;", "color: magenta;", "color: blue;");
  console.log('%c Y88b.                                                888 %c888    888 888  .88P  %c    888             ', "color: white;", "color: magenta;", "color: blue;");
  console.log('%c  "Y888b.   888  888 888d888 888d888 .d88b.   8888b.  888 %c888    888 8888888K.  %c    888888 .d8888b  ', "color: white;", "color: magenta;", "color: blue;");
  console.log('%c     "Y88b. 888  888 888P"   888P"  d8P  Y8b     "88b 888 %c888    888 888  "Y88b %c    888    88K      ', "color: white;", "color: magenta;", "color: blue;");
  console.log('%c       "888 888  888 888     888    88888888 .d888888 888 %c888    888 888    888 %c    888    "Y8888b. ', "color: white;", "color: magenta;", "color: blue;");
  console.log('%c Y88b  d88P Y88b 888 888     888    Y8b.     888  888 888 %c888  .d88P 888   d88P %cd8b%c Y88b.       X88 ', "color: white;", "color: magenta;", "color: white;", "color: blue;");
  console.log(`%c  "Y8888P"   "Y88888 888     888     "Y8888  "Y888888 888 %c8888888P"  8888888P"  %cY8P%c  "Y888  88888P' `, "color: white;", "color: magenta;", "color: white;", "color: blue;");
  console.log();
  console.log(`                                                                                    %cVersion: %c${version}`, "color: white;", "color: blue;");
  console.log(' Inspired by https://surrealdb.com/ this is a typescript clone that aims to be compatible...');
  console.log();
}