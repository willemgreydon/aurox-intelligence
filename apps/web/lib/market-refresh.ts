export function getQuoteRefreshIntervalMs(isVisible: boolean) {
  return isVisible ? 20_000 : 60_000;
}

export function shouldPollQuotes(documentHidden: boolean) {
  return !documentHidden;
}

