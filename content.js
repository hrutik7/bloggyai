// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SCRAPING') {
    // Example scraping logic - modify according to your needs
    const scrapedData = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Send scraped data back to popup
    chrome.runtime.sendMessage({
      type: 'SCRAPED_DATA',
      data: scrapedData
    });
  }
}); 