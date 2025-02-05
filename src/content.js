// Helper function to get all content
function getAllContent() {
  const contentElements = [];
  
  // Function to check if element is visible
  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  };

  // Function to check if text is meaningful
  const isMeaningfulText = (text) => {
    if (!text) return false;
    const cleanText = text.trim();
    return cleanText.length > 10 && // Minimum length
           !/^\d+$/.test(cleanText) && // Not just numbers
           !/^[^a-zA-Z]+$/.test(cleanText); // Contains some letters
  };

  // Function to process text nodes
  const processTextNode = (node) => {
    const text = node.textContent.trim();
    if (isMeaningfulText(text)) {
      return text.replace(/\s+/g, ' ');
    }
    return null;
  };

  // Function to extract content from an element
  const extractContent = (element) => {
    if (!isVisible(element)) return;

    // Handle paragraphs
    if (element.tagName === 'P') {
      const text = processTextNode(element);
      if (text) contentElements.push({ type: 'paragraph', content: text });
      return;
    }

    // Handle lists
    if (element.tagName === 'UL' || element.tagName === 'OL') {
      const listItems = Array.from(element.getElementsByTagName('li'))
        .map(li => processTextNode(li))
        .filter(Boolean);
      if (listItems.length > 0) {
        contentElements.push({ type: 'list', content: listItems });
      }
      return;
    }

    // Handle article-like div elements
    if (element.tagName === 'DIV') {
      const className = element.className.toLowerCase();
      const id = element.id.toLowerCase();
      
      // Check if div is likely to contain article content
      if (className.includes('article') || 
          className.includes('content') || 
          className.includes('post') ||
          id.includes('article') || 
          id.includes('content') || 
          id.includes('post')) {
        
        // Process direct text nodes of the div
        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = processTextNode(node);
            if (text) contentElements.push({ type: 'paragraph', content: text });
          }
        }
      }
    }

    // Recursively process child elements
    for (const child of element.children) {
      extractContent(child);
    }
  };

  // Start extraction from main content areas
  const mainContent = document.querySelector('main, article, [role="main"]') || document.body;
  extractContent(mainContent);

  // Organize content
  return {
    paragraphs: contentElements
      .filter(el => el.type === 'paragraph')
      .map(el => el.content),
    lists: contentElements
      .filter(el => el.type === 'list')
      .flatMap(el => el.content)
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
        .filter(img => img.width > 100 && img.height > 100)
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


