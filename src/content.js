// Helper function to get all paragraphs and lists
function getAllContent() {
  const paragraphs = Array.from(document.getElementsByTagName('p'))
    .map(p => p.textContent?.trim())
    .filter(Boolean);

  const lists = Array.from(document.querySelectorAll('ul, ol'))
    .map(list => Array.from(list.getElementsByTagName('li'))
      .map(li => li.textContent?.trim())
      .filter(Boolean)
    )
    .flat();

  return {
    paragraphs,
    lists
  };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_SCRAPING') {
    const content = getAllContent();
    
    const pageData = {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      paragraphs: content.paragraphs,
      lists: content.lists,
      author: document.querySelector('[rel="author"], .author, .byline')?.textContent?.trim() || '',
      publishDate: document.querySelector('[property="article:published_time"], time')?.getAttribute('datetime') || '',
      images: Array.from(document.images).slice(0, 5).map(img => img.src)
    };

    chrome.runtime.sendMessage({
      type: 'SCRAPED_DATA',
      data: pageData
    });
  }
});