// Helper function to get all paragraphs and lists
function getAllContent() {
  // Get paragraphs but limit their length and remove empty ones
  const paragraphs = Array.from(document.getElementsByTagName('p'))
    .map(p => p.textContent?.trim())
    .filter(text => text && text.length > 10) // Filter out empty or very short texts
    .map(text => text.replace(/\s+/g, ' ')); // Normalize whitespace

  // Get lists but clean them up
  const lists = Array.from(document.querySelectorAll('ul, ol'))
    .map(list => Array.from(list.getElementsByTagName('li'))
      .map(li => li.textContent?.trim())
      .filter(text => text && text.length > 5) // Filter out empty or very short items
      .map(text => text.replace(/\s+/g, ' ')) // Normalize whitespace
    )
    .flat();

  return {
    paragraphs: paragraphs.slice(0, 50), // Limit to first 50 paragraphs
    lists: lists.slice(0, 30) // Limit to first 30 list items
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
      author: document.querySelector('[rel="author"], .author, .byline')?.textContent?.trim() || 'Unknown',
      publishDate: document.querySelector('[property="article:published_time"], time')?.getAttribute('datetime') || 
                  new Date().toISOString(),
      images: Array.from(document.images)
        .filter(img => img.width > 100 && img.height > 100) // Filter out tiny images
        .slice(0, 5)
        .map(img => img.src)
    };

    // Send only if we have actual content
    if (pageData.paragraphs.length > 0 || pageData.lists.length > 0) {
      chrome.runtime.sendMessage({
        type: 'SCRAPED_DATA',
        data: pageData
      });
    }
  }
});